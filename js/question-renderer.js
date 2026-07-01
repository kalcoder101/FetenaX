// js/question-renderer.js — FetenaX v33
// Renders question text with rich formatting:
//   1. Fenced code blocks ```lang\ncode\n```    → syntax-highlighted <pre><code>
//   2. Inline code `code`                         → <code> with monospace + bg
//   3. Markdown image syntax ![alt](url)          → <img>
//   4. imageUrl field (separate DB column)        → <img> shown above/below text
//   5. Keyword highlighting                       → NOT, EXCEPT, ALWAYS, NEVER, etc.
//   6. Number highlighting                        → bold colored numbers (helps with Q&A scanning)
//
// Usage:
//   renderQuestionHTML(text, { imageUrl })   → returns HTML string
//   renderQuestionInto(element, text, opts)  → sets innerHTML + triggers Prism.highlightAllUnder()

(function () {
    'use strict';

    // Keywords that students often miss when reading fast.
    // Match whole words only, case-insensitive.
    var KEYWORDS = [
        'NOT', 'EXCEPT', 'EXCEPT THAT', 'NEVER', 'ALWAYS',
        'ALL', 'NONE', 'ONLY', 'EXACTLY', 'AT LEAST', 'AT MOST',
        'TRUE', 'FALSE', 'CORRECT', 'INCORRECT', 'INVALID', 'VALID',
        'BEST', 'WORST', 'FIRST', 'LAST', 'PRIMARY', 'MAIN',
        'INCREASE', 'DECREASE', 'MAXIMUM', 'MINIMUM',
        'MUST', 'MUST NOT', 'SHOULD', 'SHOULD NOT',
        'BEFORE', 'AFTER', 'DURING', 'WHILE', 'UNTIL'
    ];

    // Escape HTML special chars
    function esc(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Extract fenced code blocks first (so we don't accidentally highlight keywords inside code).
    // Returns { placeholders: [{id, html}], textWithPlaceholders }
    function extractCodeBlocks(text) {
        var blocks = [];
        // Match ```lang\n...\n``` or ```\n...\n```
        var re = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
        var out = text.replace(re, function (match, lang, code) {
            var id = '__CODEBLOCK_' + blocks.length + '__';
            var langClass = lang ? ' language-' + lang.toLowerCase() : '';
            var langLabel = lang ? '<div class="code-block-lang">' + esc(lang.toLowerCase()) + '</div>' : '';
            var html =
                '<div class="code-block-wrapper">' +
                    langLabel +
                    '<pre class="line-numbers"><code class="language-' + (lang ? esc(lang.toLowerCase()) : 'none') + '">' + esc(code.replace(/\n$/, '')) + '</code></pre>' +
                '</div>';
            blocks.push({ id: id, html: html });
            return '\n\n' + id + '\n\n';
        });
        return { blocks: blocks, text: out };
    }

    // Extract inline images first (markdown syntax: ![alt](url))
    function extractImages(text) {
        var imgs = [];
        var re = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
        var out = text.replace(re, function (match, alt, url) {
            var id = '__IMAGE_' + imgs.length + '__';
            imgs.push({
                id: id,
                html: '<div class="question-image-inline"><img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.parentNode.classList.add(\'image-error\');this.style.display=\'none\';this.parentNode.insertAdjacentHTML(\'beforeend\',\'<div class=\\\'image-error-msg\\\'>&#9888; Image failed to load: ' + esc(url) + '</div>\');"><div class="question-image-caption">' + esc(alt) + '</div></div>'
            });
            return '\n\n' + id + '\n\n';
        });
        return { imgs: imgs, text: out };
    }

    // Highlight keywords (NOT, EXCEPT, etc.) by wrapping them in <mark> tags.
    // We must avoid touching code that's already inside <code> tags — but we already
    // extracted code blocks. Inline code (`...`) is handled separately.
    function highlightKeywords(text) {
        var result = text;
        KEYWORDS.forEach(function (kw) {
            // Use word boundaries, case-insensitive
            var pattern = new RegExp('\\b(' + kw.replace(/ /g, '\\s+') + ')\\b', 'gi');
            result = result.replace(pattern, '<mark class="kw-highlight kw-' + kw.toLowerCase().replace(/\s+/g, '-') + '">$1</mark>');
        });
        return result;
    }

    // Highlight bare numbers (standalone integers/decimals) — but skip ones inside
    // code blocks (already extracted), URLs, or already-marked HTML.
    function highlightNumbers(text) {
        // Match numbers NOT preceded by letter, digit, underscore, or '<' (HTML attr)
        // Examples: 5, 12, 3.14, 1000, 0xFF (skip hex for now)
        // We use a regex that requires a word boundary before the digit
        return text.replace(/(^|[\s,;:()>(])(\d+(?:\.\d+)?)(?=[\s,.;:)<\-?!=]|$)/g, function (m, pre, num) {
            return pre + '<span class="num-highlight">' + num + '</span>';
        });
    }

    // Convert inline `code` → <code class="inline-code">code</code>
    function inlineCode(text) {
        return text.replace(/`([^`\n]+)`/g, function (m, code) {
            return '<code class="inline-code">' + esc(code) + '</code>';
        });
    }

    // Convert **bold** and *italic* (very simple, won't conflict with code)
    function simpleMarkdown(text) {
        // Bold first (avoid greedy across lines)
        text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        // Italic
        text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
        return text;
    }

    // Convert newlines to <br> (but preserve paragraphs by collapsing 2+ newlines)
    function lineBreaks(text) {
        // Replace 2+ newlines with paragraph break
        text = text.replace(/\n{2,}/g, '</p><p>');
        // Replace single newlines with <br>
        text = text.replace(/\n/g, '<br>');
        return text;
    }

    // Restore the placeholder IDs (code blocks, images) back into the text
    function restorePlaceholders(text, blocks, imgs) {
        blocks.forEach(function (b) {
            // The placeholder may now be wrapped in <p>...</p> due to lineBreaks. Strip them.
            text = text.replace(/<p>\s*__CODEBLOCK_\d+__\s*<\/p>/g, b.html);
            text = text.replace(/__CODEBLOCK_\d+__/g, b.html);
        });
        imgs.forEach(function (i) {
            text = text.replace(/<p>\s*__IMAGE_\d+__\s*<\/p>/g, i.html);
            text = text.replace(/__IMAGE_\d+__/g, i.html);
        });
        return text;
    }

    // Main entry point: render question text + optional imageUrl into HTML.
    window.renderQuestionHTML = function (text, opts) {
        opts = opts || {};
        if (!text) return '';
        var safeText = String(text);

        // 1. Pull out code blocks & images first (so keyword highlighting won't touch them)
        var codeExtracted = extractCodeBlocks(safeText);
        var imgExtracted = extractImages(codeExtracted.text);

        // 2. Escape remaining HTML (since we removed code/images, this is safe)
        var html = esc(imgExtracted.text);

        // 3. Highlight keywords & numbers
        html = highlightKeywords(html);
        html = highlightNumbers(html);

        // 4. Inline code (escaped earlier, so we need a different approach:
        //    search for escaped backticks `...` and wrap content in <code>)
        // Since we escaped, backticks are still ` (not a special HTML char),
        // so the inlineCode regex still works.
        html = inlineCode(html);

        // 5. Simple markdown (bold, italic)
        html = simpleMarkdown(html);

        // 6. Line breaks & paragraphs
        html = '<p>' + lineBreaks(html) + '</p>';

        // 7. Restore code blocks & images
        html = restorePlaceholders(html, codeExtracted.blocks, imgExtracted.imgs);

        // 8. If a separate imageUrl was provided (DB column), prepend it as a question image
        if (opts.imageUrl) {
            var imgHtml = '<div class="question-image-attached">' +
                '<img src="' + esc(opts.imageUrl) + '" alt="Question image" loading="lazy" ' +
                'onerror="this.parentNode.classList.add(\'image-error\');this.style.display=\'none\';this.parentNode.insertAdjacentHTML(\'beforeend\',\'<div class=\\\'image-error-msg\\\'>&#9888; Image failed to load</div>\');" ' +
                'onclick="if(this.src){window.open(this.src,\'_blank\');}" style="cursor:zoom-in;">' +
                '</div>';
            html = imgHtml + html;
        }

        return html;
    };

    // Convenience: render into a DOM element, then trigger Prism highlighting
    window.renderQuestionInto = function (element, text, opts) {
        if (!element) return;
        element.innerHTML = window.renderQuestionHTML(text, opts);
        // Trigger Prism syntax highlighting on any code blocks inside
        if (window.Prism) {
            try {
                window.Prism.highlightAllUnder(element);
            } catch (e) {
                // Prism not loaded yet — ignore
            }
        }
    };

    // Helper for rendering a question's options (also support inline code + bold)
    window.renderOptionHTML = function (text) {
        if (!text) return '';
        var safe = esc(String(text));
        safe = inlineCode(safe);
        safe = simpleMarkdown(safe);
        safe = highlightNumbers(safe);
        // Don't highlight keywords in options — too noisy
        return safe;
    };

    // Helper: count words in a question (for showing "X words" hint)
    window.countWords = function (text) {
        if (!text) return 0;
        // Strip code blocks for the count
        var stripped = String(text).replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' ');
        var words = stripped.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        return words.length;
    };

    // Helper: estimate reading time in seconds (200 wpm average for technical content)
    window.estimateReadingTime = function (text) {
        var words = window.countWords(text);
        return Math.max(3, Math.round(words / 200 * 60));
    };
})();
