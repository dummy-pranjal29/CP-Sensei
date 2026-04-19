function extractCode(platform) {
  switch (platform) {
    case "leetcode": {
      const lines = Array.from(
        document.querySelectorAll(".view-lines .view-line"),
      );

      return (
        lines
          .map((l) => l.innerText)
          .join("\n")
          .trim() || null
      );
    }

    case "codeforces": {
      const lines = Array.from(document.querySelectorAll(".CodeMirror-line"));
      const fromCM = lines.map((l) => l.innerText).join("\n").trim();
      if (fromCM) return fromCM;

      // Submit page: CodeMirror keeps a synced hidden textarea
      const textarea = document.querySelector("textarea[name='source']");
      return textarea?.value?.trim() || null;
    }

    case "geeksforgeeks": {
      const lines = Array.from(document.querySelectorAll(".CodeMirror-line"));

      return (
        lines
          .map((l) => l.innerText)
          .join("\n")
          .trim() || null
      );
    }

    default: {
      return null;
    }
  }
}

window.__cpExtractCode = extractCode;
