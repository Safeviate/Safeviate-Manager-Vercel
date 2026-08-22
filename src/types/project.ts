export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ProjectHealth = 'On Track' | 'Attention' | 'At Risk';
export type ProjectTaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'Done';
export type ProjectDiaryEntryType = 'Update' | 'Comment' | 'Blocker' | 'Decision' | 'Completion';

export interface ProjectDiaryEntry {
  id: string;
  type: ProjectDiaryEntryType;
  message: string;
  authorId?: string;
  authorName: string;
  createdAt: string;
  status?: ProjectTaskStatus;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  dueDate?: string;
  assigneeId?: string;
  phaseId?: string;
  source?: 'Project' | 'MOC Mitigation';
  sourceId?: string;
  diary?: ProjectDiaryEntry[];
}

export interface ProjectPhase {
  id: string;
  title: string;
  targetDate?: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate?: string;
  complete?: boolean;
}

export interface ProjectRisk {
  id: string;
  description: string;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Mitigating' | 'Closed';
}

export interface Project {
  id: string;
  name: string;
  objective: string;
  status: ProjectStatus;
  health: ProjectHealth;
  ownerId?: string;
  organizationId?: string | null;
  startDate?: string;
  targetDate?: string;
  mocId?: string;
  mocNumber?: string;
  mocTitle?: string;
  phases?: ProjectPhase[];
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  risks: ProjectRisk[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
