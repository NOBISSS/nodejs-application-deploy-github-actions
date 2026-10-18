# 🔥 GitHub Roast

Turn a public GitHub profile into a playful, AI-generated roast. Enter a
GitHub username to fetch public profile information, repositories, and
recent public events, then generate a structured roast with Markdown
formatting.

> **Status:** In development. The project is being hardened for
> production deployment, with Docker and CI/CD planned.

## ✨ Features

-   🔎 Look up public GitHub profiles by username.
-   📦 Fetch public repositories and recent public events.
-   🤖 Generate personalized roasts using Groq's chat completions API.
-   📝 Render the generated roast as Markdown in the React UI.
-   ⚡ Cache completed results in memory with a 10-minute TTL.
-   🔁 Deduplicate simultaneous requests for the same username within
    one backend process.
-   ✅ Validate GitHub usernames before making external API calls.
-   🛡️ Apply per-IP API rate limiting to the roast endpoint.
-   🧯 Return clearer errors for invalid usernames and common
    GitHub/Groq failures.
-   🎨 Use a dark, orange-accented interface built with React and
    Tailwind CSS.

## 🧰 Tech Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   `react-markdown`
-   `remark-gfm`

### Backend

-   Node.js
-   Express
-   TypeScript
-   Axios
-   Groq SDK
-   `express-rate-limit`

### External services

-   GitHub REST API --- public profile, repository, and event data
-   Groq API --- AI-generated roast text

## 🏗️ Architecture

``` text
Browser
  |
  v
React + Vite frontend
  |
  | GET /api/roast/:username
  v
Express + TypeScript backend
  |
  +--> Username validation
  |
  +--> In-memory result cache
  |
  +--> In-flight request deduplication
  |
  +--> GitHub REST API
  |      +--> Profile
  |      +--> Repositories
  |      +--> Public events
  |
  +--> Groq API
  |
  v
JSON response containing profile, repositories, events, and roast
```

The current cache and request-deduplication map are local to a single
Node.js process. They are not shared across multiple backend instances
and are cleared when the process restarts.

## 📁 Project Structure

The repository is organized into a frontend (`client`) and backend
(`server`).

``` text
github-roast/
├── client/
│   └── src/
│       └── App.tsx
├── server/
│   └── src/
│       ├── cache/
│       │   ├── roast.cache.ts
│       │   └── roast.request.ts
│       ├── controllers/
│       │   └── roast.controller.ts
│       ├── middleware/
│       │   └── rateLimiter.ts
│       ├── routes/
│       │   └── roast.routes.ts
│       ├── services/
│       │   ├── ai.service.ts
│       │   └── github.service.ts
│       ├── utils/
│       │   ├── apiError.ts
│       │   └── validateGithubUsername.ts
│       ├── app.ts
│       └── index.ts
└── README.md
```

> The tree reflects the current structure developed so far. If your
> local project has additional configuration or files, keep the actual
> repository structure as the source of truth.

## ⚙️ Prerequisites

Install the following before running the project:

-   Node.js and npm
-   A GitHub Personal Access Token for authenticated GitHub API requests
-   A Groq API key with access to the configured model

## 🚀 Getting Started

### 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd github-roast
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with your repository's clone URL.

### 2. Install frontend dependencies

``` bash
cd client
npm install
```

### 3. Install backend dependencies

Open another terminal, or return to the project root:

``` bash
cd server
npm install
```

### 4. Configure environment variables

Create `server/.env`:

``` env
PORT=5000
CLIENT_URL=http://localhost:5173
GITHUB_TOKEN=your_github_personal_access_token
GROQ_API_KEY=your_groq_api_key
```

Replace the placeholder values with your own credentials. Never commit
`.env` files or expose these secrets in frontend code.

Make sure `server/.env` is included in `.gitignore`.

### 5. Start the backend

From the `server` directory, use the development script configured in
your `package.json`. For example, if your project uses `tsx`:

``` bash
npm run dev
```

The backend should be available at:

``` text
http://localhost:5000
```

### 6. Start the frontend

From the `client` directory:

``` bash
npm run dev
```

Vite typically serves the frontend at:

``` text
http://localhost:5173
```

Open that address in your browser.

> Check the scripts in each `package.json` and use the commands defined
> by your project. If your scripts differ, use the existing scripts
> rather than adding duplicate ones.

## 🔌 API

### Generate or retrieve a roast

``` http
GET /api/roast/:username
```

Example:

``` http
GET http://localhost:5000/api/roast/octocat
```

A successful response has this shape:

``` json
{
  "success": true,
  "message": "Your GitHub roast is ready! 🔥",
  "data": {
    "profile": {},
    "repositories": [],
    "events": [],
    "roast": "# 🔥 The GitHub Roast\n..."
  }
}
```

The example values are illustrative. The actual `profile`,
`repositories`, and `events` fields contain data returned by GitHub.

### Health check

The backend has a root endpoint intended as a basic health check:

``` http
GET http://localhost:5000/
```

Use the exact response defined in `server/src/app.ts`.

### Common error responses

  -----------------------------------------------------------------------
  Status                              Meaning
  ----------------------------------- -----------------------------------
  `400`                               Invalid username format

  `404`                               GitHub user not found

  `429`                               A rate limit was reached

  `500`                               Unexpected internal error

  `502`                               An upstream AI request failed or
                                      returned an unusable response

  `503`                               An external service is unavailable

  `504`                               An external request timed out
  -----------------------------------------------------------------------

The exact response depends on which error occurred and how the current
service classifies it.

## 🧠 Caching and Request Deduplication

### In-memory cache

-   Completed results are cached for 10 minutes.
-   A repeated username can reuse the cached response without calling
    GitHub or Groq again.
-   Username cache keys are normalized to lowercase.
-   Cached entries are lost when the backend process restarts.
-   The current in-memory cache is not shared between server instances.

### In-flight request deduplication

-   Concurrent requests for the same normalized username can share one
    in-progress operation.
-   Different usernames can be processed independently.
-   Pending entries are removed when the operation completes or fails.

These features reduce unnecessary API calls, but the in-memory
implementation still needs bounded memory management before it should be
considered production-ready. Redis is a possible next step for shared
caching and rate-limit storage.

## 🛡️ Security Notes

-   Keep `GITHUB_TOKEN` and `GROQ_API_KEY` on the backend only.
-   Never commit secrets to source control.
-   Rotate a token immediately if it is accidentally exposed.
-   Use HTTPS in production.
-   Configure CORS to allow only the intended frontend origin.
-   Configure reverse-proxy trust settings carefully when deploying
    behind a proxy.
-   The current in-memory rate limiter is intended for a single backend
    process. A shared store is needed for consistent limits across
    multiple instances.
-   Do not rely on client-side validation alone; the backend must
    validate input too.

## 🧪 Testing and Quality Checks

Testing and CI workflows are planned as part of the production-readiness
work. Before deploying, add and run checks for:

-   Valid and invalid usernames
-   GitHub `404` and rate-limit responses
-   Groq rate limits, unavailable models, and timeouts
-   Cache hits and TTL expiration
-   Concurrent requests for the same username
-   Rate-limiter behavior
-   Frontend rendering of headings, lists, bold text, and blockquotes

Use the scripts defined in the frontend and backend `package.json` files
for any currently configured checks.

## 🚢 Deployment and DevOps Roadmap

The planned production workflow is:

``` text
Push / Pull Request
        |
        v
GitHub Actions
        |
        +--> Install dependencies
        +--> TypeScript checks
        +--> Automated tests
        +--> Build frontend and backend
        |
        v
Build versioned Docker image
        |
        v
Push image to a container registry
        |
        v
Deploy backend to AWS EC2
        |
        v
Health check and deployment result
```

Planned improvements include:

-   Docker and Docker Compose
-   GitHub Actions CI/CD
-   Versioned container images and rollback
-   Redis-backed cache and rate limiting
-   HTTPS and reverse-proxy configuration
-   Structured logging and monitoring
-   Dependency and container vulnerability scanning

The deployment pipeline is a roadmap, not a claim that these workflows
are already configured.

## 🗺️ Roadmap

-   [x] GitHub profile and repository integration
-   [x] AI-generated roast using Groq
-   [x] Markdown rendering
-   [x] In-memory result caching with TTL
-   [x] In-process request deduplication
-   [x] GitHub username validation
-   [x] Basic API rate limiting
-   [x] Initial external-service error handling
-   [ ] Bounded cache size and expired-entry cleanup
-   [ ] Automated unit and integration tests
-   [ ] Structured logging
-   [ ] API documentation with OpenAPI
-   [ ] Dockerized backend
-   [ ] GitHub Actions CI workflow
-   [ ] Automated deployment and rollback
-   [ ] Redis-backed shared caching and rate limiting
-   [ ] Production monitoring and alerting

## 🤝 Contributing

Contributions and suggestions are welcome.

1.  Fork the repository.
2.  Create a feature branch.
3.  Make a focused change.
4.  Run the available checks.
5.  Open a pull request describing the change.

Please do not include API keys, access tokens, or other secrets in
commits or issue reports.

## 📄 License

Choose and add a license file before publishing the project for reuse.
If you intend to use the MIT License, add a `LICENSE` file containing
the correct copyright holder and year.

------------------------------------------------------------------------

Built for developers who can handle the truth. 🔥
