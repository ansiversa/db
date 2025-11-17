export interface QuizTableDefinition {
    name: string;
    description: string;
    createStatement: string;
    indexes?: string[];
    operations?: QuizTableOperations;
}
export interface QuizTableOperations {
    insert: string;
    update: string;
    delete: string;
}
export declare const quizTableDefinitions: QuizTableDefinition[];
export declare const quizTableStatements: string[];
export declare const quizIndexStatements: string[];
export declare const quizTableOperationMap: Record<string, QuizTableOperations>;
