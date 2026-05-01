export type ProjectStatus = 'taslak' | 'devam eden' | 'tamamlandi';

export interface ProjectFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx';
  size: string;
  updatedAt: string;
}

export interface ProjectSection {
  id: string;
  title: string;
  content: string;
}

export interface UserInputRequirement {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'file' | 'select';
  required: boolean;
  options?: string[];
}

export interface DocumentReference {
  id: string;
  name: string;
  url: string;
}

export interface StepOutputConfig {
  type: 'text' | 'document';
  format?: 'markdown' | 'json' | 'docx' | 'pdf';
  documentTemplate?: DocumentReference;
}

export interface ProjectTypeStep {
  id: string;
  order: number;
  title: string;
  description: string;

  // AI Configuration
  systemPromptTemplate: string;
  userPromptTemplate: string;
  model: 'gpt-4' | 'claude-opus-4' | 'claude-sonnet-4.6' | 'gemini-2.5-pro';

  // Dependencies
  requiresPreviousContext: boolean;

  // Requirements & Materials
  requiredUserInputs: UserInputRequirement[];
  referenceDocuments?: DocumentReference[];
  referenceImages?: DocumentReference[];

  estimatedCredits: number;
  outputConfig?: StepOutputConfig;
}

export interface ProjectType {
  id: string;
  name: string;
  description: string;
  budget: string;
  icon: string;
  profitMargin?: number;
  credits: number;
  steps?: ProjectTypeStep[];
}

/** Sihirbaz sırasında her adımın ürettiği sonucu tutar */
export interface StepResult {
  stepIndex: number;
  stepTitle: string;
  content: string;
  userInputs: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  typeId: string;
  type: string;
  status: ProjectStatus;
  progress: number;
  lastModified: string;
  budget?: string;
  summary?: string;
  deadline?: string;
  teamMembers?: string[];
  files?: ProjectFile[];
  sections?: ProjectSection[];
  /** AI sihirbazının ürettiği adım çıktıları */
  generatedSteps?: StepResult[];
}
