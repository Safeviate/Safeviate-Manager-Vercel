import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AssetInspectionTemplatesRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const copyFrom =
    typeof resolvedSearchParams?.copyFrom === 'string' ? resolvedSearchParams.copyFrom.trim() : '';
  const template =
    typeof resolvedSearchParams?.template === 'string' ? resolvedSearchParams.template.trim() : '';
  const query = copyFrom
    ? `?copyFrom=${encodeURIComponent(copyFrom)}`
    : template
      ? `?template=${encodeURIComponent(template)}`
      : '';

  redirect(`/assets/checklists/new${query}`);
}
