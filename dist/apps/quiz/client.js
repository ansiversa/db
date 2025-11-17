import { createClient } from "@libsql/client";
import { getDbConfig } from "../../config";
let quizClient = null;
const resolveQuizConfig = () => {
    const config = getDbConfig().apps?.["quiz"];
    if (!config) {
        throw new Error("Quiz database configuration is missing. Add it under apps.quiz when initializing.");
    }
    return config;
};
const buildClient = (config) => createClient({
    url: config.url,
    authToken: config.authToken,
});
export const getQuizClient = () => {
    if (!quizClient) {
        quizClient = buildClient(resolveQuizConfig());
    }
    return quizClient;
};
export const resetQuizClient = () => {
    quizClient = null;
};
