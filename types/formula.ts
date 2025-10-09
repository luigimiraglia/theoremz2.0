export interface Formula {
  formula: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

export interface LessonWithFormulas {
  _id: string;
  title: string;
  content: any[];
  formule?: Formula[];
}