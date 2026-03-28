import { initializeFirebase } from '@/firebase';

export type AiFlowName =
  | 'analyzeMoc'
  | 'generateChecklist'
  | 'generateExam'
  | 'generateSafetyProtocolRecommendations'
  | 'parseLogbook'
  | 'summarizeDocument'
  | 'summarizeMaintenanceLogs';

type AiFlowSuccess<TResult> = {
  ok: true;
  flow: AiFlowName;
  result: TResult;
};

type AiFlowFailure = {
  ok: false;
  error: string;
  issues?: unknown;
};

export async function callAiFlow<TInput, TResult>(
  flow: AiFlowName,
  input: TInput
): Promise<TResult> {
  const { auth } = initializeFirebase();
  const currentUser = auth.currentUser;
  const idToken = currentUser ? await currentUser.getIdToken() : null;

  const response = await fetch(`/api/ai/${flow}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as
    | AiFlowSuccess<TResult>
    | AiFlowFailure;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? 'AI request failed.' : payload.error);
  }

  return payload.result;
}
