export function clientOrigins() {
  return {
    "import.meta.env.VITE_WEB_ORIGIN": JSON.stringify(
      process.env.SERVINEXO_WEB_ORIGIN || "http://127.0.0.1:5175",
    ),
    "import.meta.env.VITE_CONTRACTOR_ORIGIN": JSON.stringify(
      process.env.SERVINEXO_CONTRACTOR_ORIGIN || "http://127.0.0.1:5180",
    ),
    "import.meta.env.VITE_ADMIN_ORIGIN": JSON.stringify(
      process.env.SERVINEXO_ADMIN_ORIGIN || "http://127.0.0.1:5181",
    ),
    "import.meta.env.VITE_DEMO_API_ORIGIN": JSON.stringify(
      process.env.SERVINEXO_API_ORIGIN || "http://127.0.0.1:5190",
    ),
  };
}
