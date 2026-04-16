const { ESLint } = require("eslint");

const SUPPORTED_LINT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx"
]);

const getExtension = (fileName = "") => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot).toLowerCase();
};

const eslint = new ESLint({
  overrideConfig: {
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  useEslintrc: false,
});

const runESLint = async (code, fileName = "") => {
  const extension = getExtension(fileName);

  if (!SUPPORTED_LINT_EXTENSIONS.has(extension)) {
    return [];
  }

  try {
    const results = await eslint.lintText(code, { filePath: `file${extension || '.js'}` });

    const messages = results[0].messages;

    return messages.map((msg) => ({
      line: msg.line,
      message: msg.message,
      severity: msg.severity === 2 ? "high" : "medium",
    }));

  } catch (err) {
    console.error("ESLint Error:", err.message);
    return [];
  }
};

module.exports = { runESLint };