import axios from "axios";
import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import { AVAILABLE_SUBS, BOT_NAME, HEADERS, TAIL } from "./const";
import { Reply } from "./types";
import { getChatResponse } from "./ai";

async function getPostDom(tid: string) {
  const response = await axios.get<string>(`https://bbs.hupu.com/${tid}.html`);
  const html = response.data;
  const dom = parse(html);
  return dom;
}

function getSubName(dom: HTMLElement) {
  const title = dom.querySelector("head > title")?.text;
  const subName = title?.split("-").at(-2);
  return subName;
}

async function parseMentionElement(
  item: HTMLElement
): Promise<Reply | undefined> {
  const mention = item.querySelector(".right > .mention");
  if (!mention?.text?.includes("@了你")) return undefined;

  const tid = item
    .querySelector("div.right > div.mention > a")
    ?.getAttribute("href")
    ?.split("/")
    .at(-1)
    ?.split(".")
    .at(0);
  const nickname =
    item.querySelector("div.right > div.top > span.nickname")?.text ??
    undefined;
  const postContent = item
    .querySelectorAll("div.right > .post-content")
    .map((el) => el.textContent?.replace(`@${BOT_NAME}`, "")?.trim())
    .join("");

  if (tid === undefined) return undefined;

  const postDom = await getPostDom(tid);
  const subName = getSubName(postDom);

  if (
    subName === undefined ||
    nickname === undefined ||
    postContent === undefined
  ) {
    return undefined;
  }

  return { tid, nickname, postContent, subName };
}

async function getAllMentionData() {
  const response = await axios.get<string>(
    "https://my.hupu.com/message?tabKey=1",
    {
      headers: HEADERS,
    }
  );
  const html = response.data;
  const soup = parse(html);
  const itemsUnread = soup.querySelectorAll(
    ".content > .item:not(div:not(item)~.item)"
  );
  const mentions = (
    await Promise.all(itemsUnread.map(parseMentionElement))
  ).filter(Boolean) as Reply[];

  return mentions;
}

function getPrompt(mention: Reply) {
  return `虎扑JR${mention.nickname}：${mention.postContent}`;
}

async function createReply(mention: Reply) {
  console.log(mention);
  const chatResponse = await getChatResponse({ prompt: getPrompt(mention) });
  console.log(chatResponse);

  axios.post(
    "https://bbs.hupu.com/pcmapi/pc/bbs/v1/createReply",
    {
      tid: mention.tid,
      content: `@${mention.nickname} ${chatResponse}\n\n${TAIL}`,
    },
    { headers: HEADERS }
  );
}

async function main() {
  const mentions = await getAllMentionData();
  for (const mention of mentions) {
    if (!AVAILABLE_SUBS.includes(mention.subName)) continue;
    createReply(mention);
  }
  // const dom = await getPostDom("624869798");
  // const sub = getSubName(dom);
  // console.log({ sub, dom });
}

main();
