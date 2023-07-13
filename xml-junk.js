export const E = new Proxy(new (class E {})(), {
    get(target, property, reciever) {
        if (typeof property === 'string')
            return (...args) => new Element(property, ...args)
        return target[property]
    },
})


export function escape(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&039;')
}


export class Node {
    children
    constructor(...children) {
        this.children = Array.from(children ?? [])
    }
    *renderIterator(flavor) {
        for (const child of this.children)
            if (child instanceof Element) yield* child.renderIterator(flavor)
            else yield escape(child)
    }
    render(flavor) {
        return Array.from(this.renderIterator(flavor)).join('')
    }
}


export class Element extends Node {
    name
    attributes
    constructor(name, attributes, ...children) {
        super(...children)
        this.name = name
        this.attributes = Object(attributes ?? {})
    }
    *renderIterator(flavor) {
        yield '<'
        yield this.name
        for (const [k, v] of Object.entries(this.attributes))
            yield ` ${escape(k)}="${escape(v)}"`
        if (this.children.length === 0) yield ' />'
        else {
            yield '>'
            yield* super.renderIterator(flavor)
            yield `</${this.name}>`
        }
    }
}


export class Document extends Node {
    *renderIterator(flavor) {
        if (flavor === 'xml') yield '<?xml version="1.0" encoding="utf-8"?>'
        else if (flavor === 'html') yield '<!doctype html>'
        yield* super.renderIterator(flavor)
    }
}

