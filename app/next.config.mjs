/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Ensure grounding/*.md (read via fs in the chat route) ships with the serverless bundle.
  outputFileTracingIncludes: { "/api/chat": ["./grounding/**"] },
};
