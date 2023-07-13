import { Application, Router } from 'https://deno.land/x/oak/mod.ts'
import { Agent } from 'https://esm.sh/@intrnl/bluesky-client@0.1/agent'
import { Document, E } from './xml-junk.js'

const router = new Router()

router
    .get('/', context => {
        context.response.body = new Document(
            E.title({}, 'Bluesky 2 Feed'),
            E.footer({ style: 'text-align:center' },
                E.p({},
                    'Made by ',
                    E.a({ href: 'https://summerti.me/' }, 'Summer'),
                ),
            ),
        ).render('html')
    })
    .get('/profile/:actor', async context => {
        const agent = new Agent({ serviceUri: 'https://bsky.social/' })
        await agent.login({
            identifier: Deno.env.get('USER'),
            password: Deno.env.get('PASS'),
        })
        let profile = await agent.rpc.get('app.bsky.actor.getProfile', {
            params: { actor: context.params.actor },
        })
        profile = profile.data

        if (context.params.actor !== profile.did) {
            context.response.redirect(`/profile/${profile.did}`)
            return
        }

        let feed = await agent.rpc.get('app.bsky.feed.getAuthorFeed', {
            params: { actor: profile.did },
        })
        feed = feed.data.feed.map(p => p.post)

        context.response.type = 'application/atom+xml'
        context.response.body = new Document(
            E.feed({ xmlns: 'http://www.w3.org/2005/Atom' },
                E.id({}, profile.did),
                E.title({}, profile.displayName ?? profile.handle),
                E.updated({}, profile.indexedAt),
                ...feed.map(p => E.entry({},
                    E.id({}, p.uri),
                    E.title({},
                        p.record.text.length > 30
                            ? p.record.text.substring(0, 29) + '…'
                            : p.record.text,
                    ),
                    E.updated({}, p.indexedAt),
                    E.author({},
                        E.name({}, p.author.displayName ?? p.author.handle),
                    ),
                    E.content({}, p.record.text),
                )),
            ),
        ).render('xml')
    })
const app = new Application()

app.use(router.allowedMethods())
app.use(router.routes())

await app.listen({ port: 8000 })

