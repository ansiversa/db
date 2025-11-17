# Ansiversa DB

Shared TypeScript helpers for connecting to Ansiversa's Turso/libSQL databases. This package centralizes parent/core DB access alongside child/mini-app databases (e.g. quiz) so all server code can use a single, typed API.

## Installation

```bash
npm install @ansiversa/db
```

## Configuration

Initialize the package once during server startup. You can either construct the configuration object manually or load it from environment variables.

```ts
import { initAnsiversaDb, loadEnvConfig } from "@ansiversa/db";

// Option A: load from environment variables
// Requires ANSIVERSA_CORE_DB_URL and TURSO_AUTH_TOKEN to be set.
// Provide the list of mini-apps you want to configure.
initAnsiversaDb(
  loadEnvConfig({
    apps: ["quiz"],
  }),
);

// Option B: pass an explicit config object
// initAnsiversaDb({
//   core: {
//     url: process.env.ANSIVERSA_CORE_DB_URL!,
//     authToken: process.env.TURSO_AUTH_TOKEN!,
//   },
//   apps: {
//     quiz: {
//       url: process.env.ANSIVERSA_QUIZ_DB_URL!,
//       authToken: process.env.TURSO_AUTH_TOKEN!,
//     },
//   },
// });
```

## Usage

After initialization, import the specific helpers you need. Each helper uses the appropriate database client under the hood.

```ts
import { Core, Apps } from "@ansiversa/db";

// Fetch a user from the core database
const maybeUser = await Core.CoreUsers.getUserByEmail("user@example.com");

// Query quiz questions for the user and save a result
const questions = await Apps.Quiz.QuizQuestions.getRandomQuestionsForUser(maybeUser!.id, 5);
const firstQuestion = questions[0];

await Apps.Quiz.QuizResults.saveQuizResult({
  userId: maybeUser!.id,
  questionId: firstQuestion.id,
  isCorrect: true,
});
```

## Project structure

- `src/config`: Configuration types and loaders, including `initAnsiversaDb` and `loadEnvConfig`.
- `src/core`: Parent/core DB client and user helpers.
- `src/apps/quiz`: Quiz mini-app client plus question/result helpers.
- `src/types`: Shared domain types for core and app-specific entities.

The package targets Node 18+ and ships ESM output with TypeScript type declarations.
