export type Perspective = "customer" | "candidate" | "peer";

export type Dependency = "yes" | "no";

export type AssessmentAnswer = {
  perspective: Perspective;
  questionId: string;
  markers: string[];
  dependency?: Dependency;
};

export type AssessmentPayload = {
  companyName: string;
  industry: string;
  answers: AssessmentAnswer[];
};
