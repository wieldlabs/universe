const app = require("express").Router(), Sentry = require("@sentry/node"), d3 = import("d3"), jsdom = require("jsdom"), validateAndCreateMetadata = require("../helpers/domain-metadata")["validateAndCreateMetadata"], ethers = require("ethers")["ethers"], _RegistrarService = require("../services/RegistrarService")["Service"], rateLimit = require("express-rate-limit"), SHOW_FARHERO = !0, getCharacterSet = e => e.match(/^[a-zA-Z]+$/) ? "letter" : e.match(/^[0-9]+$/) ? "digit" : e.match(/^[a-zA-Z0-9]+$/) ? "alphanumeric" : e.match(/[\u{1F300}-\u{1F5FF}]/u) ? "emoji" : "mixed", background = async e => {
  let t = "base" === e ? "#0053FF" : "optimism" === e ? "#FF0420" : "premium" === e ? "#F9BB1C" : "#B352FF";
  return `
  <svg id="eAVy1O8efKQ1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
<style><![CDATA[
#eAVy1O8efKQ28_to {animation: eAVy1O8efKQ28_to__to 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ28_to__to { 0% {transform: translate(419.77001px,551.150021px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 19.607843% {transform: translate(407.59001px,543.466237px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 38.431373% {transform: translate(420.112048px,537.750021px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 58.823529% {transform: translate(433.50001px,543.466244px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 78.431373% {transform: translate(419.77001px,551.080021px)} 100% {transform: translate(419.77001px,551.080021px)}} #eAVy1O8efKQ28_tr {animation: eAVy1O8efKQ28_tr__tr 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ28_tr__tr { 0% {transform: rotate(0deg)} 78.431373% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.075,0.82,0.165,1)} 86.27451% {transform: rotate(11.31deg);animation-timing-function: cubic-bezier(0,1.025,0.025,1.02)} 98.039216% {transform: rotate(0deg)} 100% {transform: rotate(0deg)}} #eAVy1O8efKQ28_ts {animation: eAVy1O8efKQ28_ts__ts 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ28_ts__ts { 0% {transform: scale(1,1)} 78.431373% {transform: scale(1,1);animation-timing-function: cubic-bezier(0.075,0.82,0.165,1)} 86.27451% {transform: scale(1,0.1);animation-timing-function: cubic-bezier(0,1.025,0.025,1.02)} 98.039216% {transform: scale(1,1)} 100% {transform: scale(1,1)}} #eAVy1O8efKQ30_to {animation: eAVy1O8efKQ30_to__to 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ30_to__to { 0% {transform: translate(597.269989px,551.22995px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 19.607843% {transform: translate(583.829989px,543.386166px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 38.431373% {transform: translate(597.64741px,537.82995px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 58.823529% {transform: translate(610.205887px,543.546173px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 78.431373% {transform: translate(597.269989px,551.15995px)} 100% {transform: translate(597.269989px,551.15995px)}} #eAVy1O8efKQ30_tr {animation: eAVy1O8efKQ30_tr__tr 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ30_tr__tr { 0% {transform: rotate(0deg)} 78.431373% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.075,0.82,0.165,1)} 86.27451% {transform: rotate(-11.306193deg);animation-timing-function: cubic-bezier(0,1.025,0.025,1.02)} 98.039216% {transform: rotate(0deg)} 100% {transform: rotate(0deg)}} #eAVy1O8efKQ30_ts {animation: eAVy1O8efKQ30_ts__ts 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ30_ts__ts { 0% {transform: scale(1,1)} 78.431373% {transform: scale(1,1);animation-timing-function: cubic-bezier(0.075,0.82,0.165,1)} 86.27451% {transform: scale(1,0.1);animation-timing-function: cubic-bezier(0,1.025,0.025,1.02)} 98.039216% {transform: scale(1,1)} 100% {transform: scale(1,1)}} #eAVy1O8efKQ32_to {animation: eAVy1O8efKQ32_to__to 5100ms linear infinite normal forwards}@keyframes eAVy1O8efKQ32_to__to { 0% {transform: translate(510.857224px,602.567139px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 19.607843% {transform: translate(498.01997px,601.958039px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 39.215686% {transform: translate(512.633088px,596.251347px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 58.823529% {transform: translate(520.646287px,601.958039px);animation-timing-function: cubic-bezier(0.68,-0.55,0.265,1.55)} 78.431373% {transform: translate(511.99997px,602.567139px)} 100% {transform: translate(511.99997px,602.567139px)}}
]]></style>

  <svg width="1024" height="1024">
<rect width="1024" height="1024" fill="${t}" />
    </svg><path d="M682.5,357.46c-2.57,1.07-1.83,4.85-1.06,7.07.104631.306889.121945.635851.05.95q-.85,3.68.66,7c.81,1.79.05,3.75.68,5.72c2.15,6.72,1.82,13.48,2.82,19.78q.67,4.23,1.19,8.47c.39,3.2,2.11,6.62,1.99,10.3q-.38,11.23,1.41,21.86.75,4.47.68,8.38c-.16,8.85.19,19.28.13,26.5q-.12,16.63-.03,33.26c.02,2.13.5,4.16.4,6.02q-.6,12.19-.3,24.4.05,1.93.93,5.53c1.14,4.61-.17,10.75-.65,14.83-1.24,10.62-4.74,21.22-8.6,31.15-.98,2.54-8.18,18.55-10.23,19.34-.378222.144792-.656828.3231-.75.48-7.61,12.36-17.1,20.66-28.41,29.55-2.15,1.69-5.03,3-7.39,4.89-1.53,1.23-3.62,1.73-4.97,3.4q-.34.42-.78.59c-3.57,1.45-6.39,3.69-10,4.8-3.5,1.07-7.21,2.59-10.44,3.47-18.9,5.16-38.24,6.36-57.76,6.26q-33.07-.17-66.14-.15c-.070832-.000353-.131905.040362-.15.1l-.04.11c-.035732.129361-.150104.219225-.28.22-24.22-.1-39.57.25-59.96-3.52q-3.16-.58-17.53-4.7c-3.13-.9-6.31-2.73-9.62-3.8-5.52-1.77-12.55-5.63-16.9-9.46q-2.01-1.76-4.04-3.49c-1.21-1.03-2.74-1.28-4.03-2.49q-1.68-1.58-2.66-2.15c-4.56-2.66-7.34-7.07-10.35-10.21q-4.53-4.71-8.06-10.26c-.020042-.034225-.055536-.056433-.096419-.060326s-.082695.010951-.113581.040326l-.11.11c-.06309.05614-.145996.084247-.225593.076481s-.147367-.050572-.184407-.116481c-6.79-11.61-10.02-17.76-14.26-29.05-.64-1.71-.84-3.94-1.9-5.84q-1.21-2.16-1.46-3.54-2.5-13.48-3.98-27.1c-1.18-10.85-.32-22.81-.79-34.24-.46-11.35.77-31.08,1-46.52.1-6.2,1.22-12.34,1.46-18.63.24-5.98,1.34-12.38,1.43-19.36q.05-3.67,1.56-18.83c.08-.78.72-1.53.74-2.29q.15-5.41-.17-14.57.62-8.31,2.2-16.48q1.06-5.46,1.52-9.23c.46-3.71,3.11-19.19,3.37-19.32.229772-.115049.371047-.338734.36-.57q-.15-2.2,1.18-3.93c.191756-.255022.271282-.573126.22-.88q-.78-4.77,2.25-8.54c1.71-2.12,2.22-6.49,2.58-10.52q.45-5.24,5.85-7.26c24.33,21.44,45.87,46.89,65.03,73.42q-1.99,8.29.69,19.67c.156513.660894.693236,1.162098,1.36,1.27q5.49.89,11.68-1.08q72.68-10.04,145.56-1.26q4.69.56,8.47.74c.95037.043996,1.849905-.430652,2.35-1.24q22.32-35.82,50.23-66.3c10.27-11.23,18.73-20.01,29.6-28.56q2.65-2.08,3.5,1.17q5.78,22,9.29,44.62ZM449.67,551.24c0-14.309698-11.600302-25.91-25.91-25.91s-25.91,11.600302-25.91,25.91s11.600302,25.91,25.91,25.91s25.91-11.600302,25.91-25.91Zm173.43-.01c0-6.850542-2.721367-13.420504-7.565432-18.264568s-11.414026-7.565432-18.264568-7.565432c-14.265515,0-25.83,11.564485-25.83,25.83s11.564485,25.83,25.83,25.83s25.83-11.564485,25.83-25.83ZM492.5,593.85c4.01,7.44,11.18,14.77,17.61,19.91.232037.177985.553532.182054.79.01q11.16-8.35,18.36-20.3c.068327-.109478.078074-.245668.026033-.36376s-.15913-.202796-.286033-.22624q-16.78-3.11-35.84-.33c-.28744.040866-.536879.219365-.668309.478243s-.128329.56559.008309.821757Z" transform="translate(.059509 0)" fill="#f7f6f6"/><path d="M354.74,315.01q-5.4,2.02-5.85,7.26c-.36,4.03-.87,8.4-2.58,10.52q-3.03,3.77-2.25,8.54c.051282.306874-.028244.624978-.22.88q-1.33,1.73-1.18,3.93c.011047.231266-.130228.454951-.36.57-.26.13-2.91,15.61-3.37,19.32q-.46,3.77-1.52,9.23-1.58,8.17-2.2,16.48-.89,2.57-1.28,5.25c-.53,3.66-1.34,7.64-1.5,12.5q-.27,8.62-2.64,39.32c-.09,1.15.03,3.39-.42,4.95q-.74,2.57-.82,3.6c-1.13,16.18-2.78,32.72-2.62,49.14.08,9.23-.69,18.76-.4,29.31.31,10.91,2.02,22.13,3.5,33.19q.87,6.47,2.72,10.78c1.33,3.11.95,5.86,1.86,9.05q.78,2.73,3.36,6.22q5.68,7.7,7.08,10.19q7.22,12.89,18.14,22.79c.74.66,1.47.96,2.09,1.65q2.58,2.83,5.28,5.58.28.28.84.47.92.31,2.21,1.38q15.49,12.81,36.35,19.49c.139103.043761.270629.175287.36.36q.08.19.2.22q16.06,4.33,32.63,5.46c4.46.31,11.59.99,18.04,1.16q22.56.58,36.88.43q28.49-.29,57-.13q23.53.13,42.67-2.92c19.72-3.15,36.46-12.16,52.71-23.73q6.77-4.82,12.81-10.54c7.01-6.66,13.18-16.16,19.89-24.1c3.3-3.91,3.52-9.72,6.13-14.49.62-1.12,3.56-10.18,5.43-5.82q-5.61,23.13-19.96,42.04l-.86-1.11c-.163025-.214168-.522959-.231514-.83-.04q-4.16,2.67-9.35,7.07-12.1,10.26-26.96,18.46-2.18,1.21-5.66,2.72c-4.91,2.13-9.59,4.73-14.39,6.24-18.17,5.71-37.33,7.36-56.6,7.35q-36.71-.02-73.41.05-35.95.06-44.19-.83c-15.04-1.63-27.59-2.47-40.19-8.56-4.49-2.18-9.81-4.04-13.65-6.07-6.88-3.63-12.24-7.98-18.63-13.28-2.09-1.73-4-4.18-6.2-6.07-4.76-4.06-9.72-8.56-13.48-13.53-2.86-3.78-6.46-7.21-8.37-11.65q-1.81-4.21-4.66-7.85-.96-1.22-2.01-3.34-.86-1.76-2.23-3.31c-.086621-.099301-.21079-.157613-.339718-.159537s-.249648.052733-.330282.149537q-1.16,1.4-.62,3.22-2.79-7.35-4.06-13.25c-6.27-29.09-6.44-58.7-4.96-88.68c2.71-55.3,10.53-110.32,21.7-164.53q1.66-8.05,4.46-15.78c.117476-.315928.363969-.567154.66624-.679034s.625541-.071539.87376.109034l5.27,3.82Z" fill="#e8e7e7"/><path d="M682.5,357.46q11.34,60.16,15.8,121.21q2.79,38.17.4,72.77-.98,14.13-4.99,31.06c-1.87-4.36-4.81,4.7-5.43,5.82-2.61,4.77-2.83,10.58-6.13,14.49-6.71,7.94-12.88,17.44-19.89,24.1q-6.04,5.72-12.81,10.54c-16.25,11.57-32.99,20.58-52.71,23.73q-19.14,3.05-42.67,2.92-28.51-.16-57,.13-14.32.15-36.88-.43c-6.45-.17-13.58-.85-18.04-1.16q-16.57-1.13-32.63-5.46-.12-.03-.2-.22c-.089371-.184713-.220897-.316239-.36-.36q-20.86-6.68-36.35-19.49-1.29-1.07-2.21-1.38-.56-.19-.84-.47-2.7-2.75-5.28-5.58c-.62-.69-1.35-.99-2.09-1.65q-10.92-9.9-18.14-22.79-1.4-2.49-7.08-10.19-2.58-3.49-3.36-6.22c-.91-3.19-.53-5.94-1.86-9.05q-1.85-4.31-2.72-10.78c-1.48-11.06-3.19-22.28-3.5-33.19-.29-10.55.48-20.08.4-29.31-.16-16.42,1.49-32.96,2.62-49.14q.08-1.03.82-3.6c.45-1.56.33-3.8.42-4.95q2.37-30.7,2.64-39.32c.16-4.86.97-8.84,1.5-12.5q.39-2.68,1.28-5.25.32,9.16.17,14.57c-.02.76-.66,1.51-.74,2.29q-1.51,15.16-1.56,18.83c-.09,6.98-1.19,13.38-1.43,19.36-.24,6.29-1.36,12.43-1.46,18.63-.23,15.44-1.46,35.17-1,46.52.47,11.43-.39,23.39.79,34.24q1.48,13.62,3.98,27.1.25,1.38,1.46,3.54c1.06,1.9,1.26,4.13,1.9,5.84c4.24,11.29,7.47,17.44,14.26,29.05.03704.065909.10481.108716.184407.116481s.162503-.020341.225593-.076481l.11-.11c.030886-.029375.072698-.04422.113581-.040326s.076377.026101.096419.060326q3.53,5.55,8.06,10.26c3.01,3.14,5.79,7.55,10.35,10.21q.98.57,2.66,2.15c1.29,1.21,2.82,1.46,4.03,2.49q2.03,1.73,4.04,3.49c4.35,3.83,11.38,7.69,16.9,9.46c3.31,1.07,6.49,2.9,9.62,3.8q14.37,4.12,17.53,4.7c20.39,3.77,35.74,3.42,59.96,3.52.129896-.000775.244268-.090639.28-.22l.04-.11c.018095-.059638.079168-.100353.15-.1q33.07-.02,66.14.15c19.52.1,38.86-1.1,57.76-6.26c3.23-.88,6.94-2.4,10.44-3.47c3.61-1.11,6.43-3.35,10-4.8q.44-.17.78-.59c1.35-1.67,3.44-2.17,4.97-3.4c2.36-1.89,5.24-3.2,7.39-4.89c11.31-8.89,20.8-17.19,28.41-29.55.093172-.1569.371778-.335208.75-.48c2.05-.79,9.25-16.8,10.23-19.34c3.86-9.93,7.36-20.53,8.6-31.15.48-4.08,1.79-10.22.65-14.83q-.88-3.6-.93-5.53-.3-12.21.3-24.4c.1-1.86-.38-3.89-.4-6.02q-.09-16.63.03-33.26c.06-7.22-.29-17.65-.13-26.5q.07-3.91-.68-8.38-1.79-10.63-1.41-21.86c.12-3.68-1.6-7.1-1.99-10.3q-.52-4.24-1.19-8.47c-1-6.3-.67-13.06-2.82-19.78-.63-1.97.13-3.93-.68-5.72q-1.51-3.32-.66-7c.071945-.314149.054631-.643111-.05-.95-.77-2.22-1.51-6,1.06-7.07Z" fill="#eeeded"/><path d="M419.77,388.43c2.48,3.53,12.43,19.51,13.73,19.86q-6.19,1.97-11.68,1.08c-.666764-.107902-1.203487-.609106-1.36-1.27q-2.68-11.38-.69-19.67Z" fill="#e8e7e7"/><circle r="25.91" transform="matrix(1.417075 0 0 1.30003 423.759996 551.239994)" fill="#f7f6f6"/><circle r="25.91" transform="matrix(1.417075 0 0 1.30003 502.184417 596.451401)" fill="#f7f6f6"/><g id="eAVy1O8efKQ28_to" transform="translate(419.77001,551.150021)"><g id="eAVy1O8efKQ28_tr" transform="rotate(0)"><g id="eAVy1O8efKQ28_ts" transform="scale(1,1)"><circle r="25.91" transform="translate(-0.00001,-0.000021)" fill="#060606"/></g></g></g><circle r="25.91" transform="matrix(1.417075 0 0 1.30003 594.716413 551.240001)" fill="#f7f6f6"/><g id="eAVy1O8efKQ30_to" transform="translate(597.269989,551.22995)"><g id="eAVy1O8efKQ30_tr" transform="rotate(0)"><g id="eAVy1O8efKQ30_ts" transform="scale(1,1)"><circle r="25.83" transform="translate(0.000011,0.00005)" fill="#060606"/></g></g></g><path d="M673.75,624.54q-19.02,25.73-48.21,38.96l-1.42-1.73c-.16762-.204686-.511274-.264625-.86-.15-2.66.9-5.57.97-7.98,1.61q-14.08,3.73-22.84,4.41c-6.74.52-13.55,1.49-20.02,1.67q-24.52.65-44.17-.51-1.19-.07-1.88.2-.61.24-.93.24-29.23.02-58.47-.01-.03,0-1.92.16c-6.91.57-13.84.04-19.57-.32-7.07-.44-17.78-.42-26.66-2.62-3.51-.87-7.54-1.16-11.21-2.49q-11.11-4.03-21.85-8.99-.42-.19-.75-.53-.41-.42-.79-.57-4.98-1.91-9.64-6.21-1.78-1.64-3.32.1c-.060801.067114-.092244.302936-.08.6q.02.27-.68.18-28.21-21.15-39.71-54.54-.54-1.82.62-3.22c.080634-.096804.201354-.151461.330282-.149537s.253097.060236.339718.159537q1.37,1.55,2.23,3.31q1.05,2.12,2.01,3.34q2.85,3.64,4.66,7.85c1.91,4.44,5.51,7.87,8.37,11.65c3.76,4.97,8.72,9.47,13.48,13.53c2.2,1.89,4.11,4.34,6.2,6.07c6.39,5.3,11.75,9.65,18.63,13.28c3.84,2.03,9.16,3.89,13.65,6.07c12.6,6.09,25.15,6.93,40.19,8.56q8.24.89,44.19.83q36.7-.07,73.41-.05c19.27.01,38.43-1.64,56.6-7.35c4.8-1.51,9.48-4.11,14.39-6.24q3.48-1.51,5.66-2.72q14.86-8.2,26.96-18.46q5.19-4.4,9.35-7.07c.307041-.191514.666975-.174168.83.04l.86,1.11Z" fill="#e3e2e2"/>
<g id="eAVy1O8efKQ32_to" transform="translate(510.857224,602.567139)"><path d="M510.11,613.76c-6.43-5.14-13.6-12.47-17.61-19.91-.136638-.256167-.139739-.562879-.008309-.821757s.380869-.437377.668309-.478243q19.06-2.78,35.84.33c.126903.023444.233992.108147.286033.22624s.042294.254282-.026033.36376q-7.2,11.95-18.36,20.3c-.236468.172054-.557963.167985-.79-.01Z" transform="translate(-510.857224,-602.567139)" fill="#060606"/></g>
<path d="M625.54,663.5c-21.33,9.81-43.14,12.49-66.54,12.59q-64.37.26-97.44.1c-33.75-.16-63.99-6.86-91.06-27.65q.7.09.68-.18c-.012244-.297064.019199-.532886.08-.6q1.54-1.74,3.32-.1q4.66,4.3,9.64,6.21.38.15.79.57.33.34.75.53q10.74,4.96,21.85,8.99c3.67,1.33,7.7,1.62,11.21,2.49c8.88,2.2,19.59,2.18,26.66,2.62c5.73.36,12.66.89,19.57.32q1.89-.16,1.92-.16q29.24.03,58.47.01.32,0,.93-.24.69-.27,1.88-.2q19.65,1.16,44.17.51c6.47-.18,13.28-1.15,20.02-1.67q8.76-.68,22.84-4.41c2.41-.64,5.32-.71,7.98-1.61.348726-.114625.69238-.054686.86.15l1.42,1.73Z" fill="#dddcdc"/>
</svg>
  `;
}, Metadata = require("../models/Metadata")["Metadata"], CastHandle = require("../models/CastHandle")["CastHandle"], JSDOM = jsdom["JSDOM"], lightLimiter = rateLimit({
  windowMs: 1e3,
  max: 1e3,
  message: "Too many requests, please try again later.",
  handler: (e, t, a) => {
    t.status(429).send("Too many requests, please try again later.");
  }
}), bebLogo = (app.get("/domain/:domain", lightLimiter, async (e, t) => {
  try {
    var a = await validateAndCreateMetadata(e.params.domain);
    return t.json(a);
  } catch (e) {
    return Sentry.captureException(e), t.json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/bulk-domain", lightLimiter, async (e, t) => {
  try {
    var a, r, i = e.query["domains"];
    return i && Array.isArray(i) && 0 !== i.length ? (a = i.map(e => decodeURIComponent(e)), 
    r = await Promise.all(a.map(async t => {
      try {
        return {
          domain: t,
          result: await validateAndCreateMetadata(t)
        };
      } catch (e) {
        return {
          domain: t,
          error: e.message
        };
      }
    })), t.json({
      code: "200",
      success: !0,
      results: r
    })) : t.status(400).json({
      code: "400",
      success: !1,
      message: "Invalid input. Please provide an array of encoded domains in the query."
    });
  } catch (e) {
    return Sentry.captureException(e), t.status(500).json({
      code: "500",
      success: !1,
      message: "An error occurred while processing the request."
    });
  }
}), '<svg height="100%" fill="rgb(0,0,0,0.6)" version="1" viewBox="100 -50 1280 1280"></svg>'), parseWear = e => {
  e = parseFloat(e);
  return e < .05 ? "Pristine" : e < .2 ? "Mint" : e < .45 ? "Lightly Played" : e < .75 ? "Moderately Played" : "Heavily Played";
}, processUriRequest = async (r, i) => {
  try {
    var s = r.params.uri;
    if (!s || 0 == s.length) throw Error("uri invalid!");
    var n = ethers.BigNumber.from(s), o = ethers.BigNumber.from(2).pow(256).sub(1);
    if (n.gt(o)) throw new Error("The URI is too large to be represented in a 64-character-long hexadecimal string!");
    var c, m = CastHandle.normalizeTokenId(n.toHexString()), l = await Metadata.findOne({
      uri: m
    });
    if (!l) return c = {
      name: "~no_metadata_please_search_domain",
      description: "This domain does not have metadata, navigate to far.quest or Wield and search the domain you minted again to refresh!"
    }, i.json(c);
    var p = l.domain;
    let t = await CastHandle.findOne({
      handle: p
    });
    var d = (t = t || await CastHandle.findOne({
      tokenId: m
    }))?.expiresAt, f = p.startsWith("op_") ? p.replace("op_", "") + ".op.cast" : p.startsWith("base_") ? p.replace("base_", "") + ".base.cast" : p + ".cast", u = p.replace("op_", "").replace("base_", "").length;
    if (t?.displayItemId && SHOW_FARHERO) {
      let e = [];
      t.displayMetadata?.rarity && e.push({
        trait_type: "Rarity",
        value: t.displayMetadata.rarity
      }), t.displayMetadata?.name && e.push({
        trait_type: "FarHero",
        value: t.displayMetadata.name
      }), t.displayMetadata?.wear && (e.push({
        trait_type: "Wear",
        value: parseWear(t.displayMetadata.wear)
      }), e.push({
        trait_type: "Wear Value",
        value: Number(t.displayMetadata.wear),
        display_type: "number",
        max_value: 1
      })), t.displayMetadata?.foil && e.push({
        trait_type: "Foil",
        value: t.displayMetadata.foil
      }), e = [ ...e, {
        trait_type: "Length",
        value: u,
        display_type: "number"
      }, {
        trait_type: "Category",
        value: p.startsWith("op_") ? "Optimism Renewal" : p.startsWith("base_") ? "Base Renewal" : p.length < 10 ? "Premium Renewal" : "Free Renewal"
      }, {
        trait_type: "Game",
        value: "FarHero"
      }, {
        trait_type: "Character Set",
        value: getCharacterSet(p.replace("op_", "").replace("base_", ""))
      }, {
        display_type: "date",
        trait_type: "Expiration Date",
        value: d
      } ];
      var h = p.startsWith("op_") || p.startsWith("base_") ? "Check out FarHero (https://far.quest/hero) and https://far.quest 👁️" : `Check the status of ${f} on https://wield.xyz, check out FarHero (https://far.quest/hero), and https://far.quest 👁️`, g = {
        name: f,
        description: (A = t.displayMetadata?.description, M = " Also check out https://far.quest 👁️", 
        (A ? A.includes?.("Open this pack") ? "Open this pack on https://far.quest/hero to get an FarHero!" + M : A.includes?.("Play FarHero") ? "Play FarHero on https://far.quest/hero, the epic Farcaster trading card game!" + M : A : null) || h),
        image: t.displayMetadata?.image.startsWith("/") ? "https://far.quest/" + t.displayMetadata.image : t.displayMetadata.image,
        attributes: e
      };
      return "farhero" === t.displayMetadata?.displayType && (g.animation_url = "https://far.quest/~/metadata?metadata=" + encodeURIComponent(JSON.stringify(t.displayMetadata))), 
      i.json(g);
    }
    var q = new JSDOM("<!DOCTYPE html><html><body></body></html>"), y = (await d3).select(q.window.document).select("body");
    let e = [ ...p ].length;
    p.match(/^[\u0000-\u007f]*$/) || (e *= 2);
    var _ = {
      free: "free",
      premium: "premium",
      optimism: "optimism",
      base: "base"
    };
    let a = _.free;
    p.startsWith("op_") ? a = _.optimism : p.startsWith("base_") ? a = _.base : e < 10 && (a = _.premium);
    var b = parseInt(80 * Math.pow(.95, e)), x = `
    <svg width="500" height="500">
      ${await background(a)}
    </svg>
  `, w = (y.append("div").attr("class", "container").append("svg").attr("width", 500).attr("height", 500).attr("xmlns", "http://www.w3.org/2000/svg").html(x + bebLogo).append("text").attr("x", 250).attr("y", 475).attr("font-size", b + "px").attr("font-family", "Inter, sans-serif").attr("fill", "#fff").attr("text-anchor", "middle").style("font-weight", "900").style("text-shadow", "-1px 0 #111111, 0 1px #111111, 1px 0 #111111, 0 -1px #111111, 1px 2px 0px #111111").text(f), 
    y.select(".container").html()), v = "data:image/svg+xml;base64," + Buffer.from(w).toString("base64"), O = (process.env.NODE_ENV, 
    {
      name: f,
      description: p.startsWith("op_") || p.startsWith("base_") ? "Check out https://far.quest and FarHero (https://far.quest/hero) 👁️" : `Check the status of ${f} on https://wield.xyz, check out https://far.quest and FarHero (https://far.quest/hero) 👁️`,
      image: v,
      attributes: [ {
        trait_type: "Length",
        value: u,
        display_type: "number"
      }, {
        trait_type: "Category",
        value: p.startsWith("op_") ? "Optimism Renewal" : p.startsWith("base_") ? "Base Renewal" : p.length < 10 ? "Premium Renewal" : "Free Renewal"
      }, {
        trait_type: "Character Set",
        value: getCharacterSet(p.replace("op_", "").replace("base_", ""))
      }, {
        display_type: "date",
        trait_type: "Expiration Date",
        value: d
      } ]
    });
    return i.json(O);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), i.json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
  var A, M;
};

app.get("/uri/:uri", lightLimiter, processUriRequest), app.get("/uri/:uri/image", lightLimiter, async (t, e) => {
  var a, r = await new Promise(e => {
    processUriRequest(t, {
      json: e
    });
  });
  return "500" !== r.code && r.image ? (a = r.image.split(",")[1], a = Buffer.from(a, "base64"), 
  e.setHeader("Content-Type", "image/svg+xml"), e.send(a)) : e.status(500).json(r);
}), module.exports = {
  router: app
};