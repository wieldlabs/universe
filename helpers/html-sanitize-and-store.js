const sanitizeHtml = require("sanitize-html"), cleanContentHtml = a => a ? sanitizeHtml(a, {
  allowedTags: [ "p", "a", "span", "br", "h1", "h2", "h3", "ul", "ol", "li", "pre", "code" ],
  allowedAttributes: {
    a: [ "class", "href", "target", "rel" ],
    p: [ "class" ],
    span: [ "class", "data-id", "data-type" ],
    h1: [ "class" ],
    h2: [ "class" ],
    h3: [ "class" ],
    ul: [ "class" ],
    ol: [ "class" ],
    li: [ "class" ],
    pre: [ "class" ],
    code: [ "class" ]
  }
}) : "", cleanIframeHtml = a => a ? sanitizeHtml(a, {
  allowedTags: [ "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4", "h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div", "dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p", "pre", "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption", "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr" ],
  allowedAttributes: !1
}) : "";

module.exports = {
  cleanContentHtml: cleanContentHtml,
  cleanIframeHtml: cleanIframeHtml
};