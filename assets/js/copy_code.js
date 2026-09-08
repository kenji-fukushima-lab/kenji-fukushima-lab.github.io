// create element for copy button in code blocks
var codeBlocks = document.querySelectorAll("pre");
codeBlocks.forEach(function (codeBlock) {
  if (
    (codeBlock.querySelector("pre:not(.lineno)") || codeBlock.querySelector("code")) &&
    codeBlock.querySelector("code:not(.language-chartjs)") &&
    codeBlock.querySelector("code:not(.language-diff2html)") &&
    codeBlock.querySelector("code:not(.language-echarts)") &&
    codeBlock.querySelector("code:not(.language-geojson)") &&
    codeBlock.querySelector("code:not(.language-mermaid)") &&
    codeBlock.querySelector("code:not(.language-vega_lite)")
  ) {
    // create copy button
    var copyButton = document.createElement("button");
    copyButton.className = "copy";
    copyButton.type = "button";
    const isJapanese = document.documentElement.lang.startsWith("ja");
    const copyLabel = isJapanese ? "コードをコピー" : "Copy code to clipboard";
    const copiedLabel = isJapanese ? "コードをコピーしました。" : "Code copied to clipboard.";
    const failedLabel = isJapanese
      ? "コピーできませんでした。コードを選択してコピーしてください。"
      : "Could not copy. Select the code and copy it manually.";
    copyButton.ariaLabel = copyLabel;
    copyButton.title = copyLabel;
    copyButton.innerHTML = '<i class="fa-solid fa-clipboard" aria-hidden="true"></i>';
    const copyStatus = document.createElement("span");
    copyStatus.className = "sr-only";
    copyStatus.setAttribute("role", "status");
    let resetTimer = null;

    copyButton.addEventListener("click", async function () {
      if (copyButton.getAttribute("aria-disabled") === "true") return;
      window.clearTimeout(resetTimer);
      copyStatus.textContent = "";
      // Native disabled blurs the button. Keep focus while blocking repeat activation.
      copyButton.setAttribute("aria-disabled", "true");
      try {
        // Keep indentation and trailing newlines; exclude a separate line-number column.
        const code = (codeBlock.querySelector("pre:not(.lineno)") || codeBlock.querySelector("code")).innerText;
        await window.navigator.clipboard.writeText(code);
        copyStatus.textContent = copiedLabel;
        copyButton.title = copiedLabel;
        copyButton.innerHTML = '<i class="fa-solid fa-clipboard-check" aria-hidden="true"></i>';
      } catch {
        copyStatus.textContent = failedLabel;
        copyButton.title = failedLabel;
        copyButton.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>';
      } finally {
        copyButton.removeAttribute("aria-disabled");
        resetTimer = window.setTimeout(function () {
          copyButton.title = copyLabel;
          copyButton.innerHTML = '<i class="fa-solid fa-clipboard" aria-hidden="true"></i>';
          copyStatus.textContent = "";
        }, 3000);
      }
    });

    // create wrapper div
    var wrapper = document.createElement("div");
    wrapper.className = "code-display-wrapper";

    // add copy button and code block to wrapper div
    const parent = codeBlock.parentElement;
    parent.insertBefore(wrapper, codeBlock);
    wrapper.append(codeBlock);
    wrapper.append(copyButton);
    wrapper.append(copyStatus);
  }
});
