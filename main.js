import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Agent } from "https://esm.sh/@intrnl/bluesky-client@0.1/agent";
import { Document, E } from "./xml-junk.js";

const router = new Router();

function truncate(chars, indicator, text) {
  if (text.length > chars) {
    text = text.substring(0, chars - indicator.length) + indicatorz;
  }
  return text;
}

router
  .get("/", (context) => {
    context.response.body = new Document(
      E.title({}, "Bluesky 2 Feed"),
      E.footer(
        { style: "text-align:center" },
        E.p({}, "Made by ", E.a({ href: "https://summerti.me/" }, "Summer")),
      ),
    ).render("html");
  })
  .get("/profile/:actor", async (context) => {
    const agent = new Agent({ serviceUri: "https://bsky.social/" });
    await agent.login({
      identifier: Deno.env.get("USER"),
      password: Deno.env.get("PASS"),
    });
    let profile = await agent.rpc.get("app.bsky.actor.getProfile", {
      params: { actor: context.params.actor },
    });
    profile = profile.data;

    if (context.params.actor !== profile.did) {
      context.response.redirect(`/profile/${profile.did}`);
      return;
    }

    let feed = await agent.rpc.get("app.bsky.feed.getAuthorFeed", {
      params: { actor: profile.did },
    });
    feed = feed.data.feed.map((p) => p.post);

    context.response.type = "application/atom+xml";
    context.response.body = new Document(
      E.feed(
        { xmlns: "http://www.w3.org/2005/Atom" },
        E.id({}, profile.did),
        E.title({}, profile.displayName ?? profile.handle),
        E.subtitle({}, profile.description),
        E.updated({}, profile.indexedAt),
        E.author({}, E.name({}, p.author.displayName ?? p.author.handle)),
        E.link({ href: `https://bsky.app/profile/${profile.did}` }),
        E.generator({}, "Feedsky"),
        E.icon({}, profile.avatar),
        E.logo({}, profile.banner),
        ...feed.map((post) =>
          E.entry(
            {},
            E.id({}, post.uri),
            E.title({ type: "text" }, truncate(80, "…", post.record.text)),
            E.published({}, post.record.createdAt),
            E.updated({}, post.indexedAt),
            E.author(
              {},
              E.name({}, post.author.displayName ?? post.author.handle),
            ),
            E.content({ type: "text" }, post.record.text),
            E.link({
              href: `https://bsky.app/profile/${profile.did}/post/${
                post.uri.split("/").at(-1)
              }`,
            }),
          )
        ),
      ),
    ).render("xml");
  });
const app = new Application();

app.use(router.allowedMethods());
app.use(router.routes());

await app.listen({ port: 8000 });
