import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseDocument } = require('htmlparser2');

class TextNode {
  nodeType = 3;
  constructor(text, document) { this.textContent = text; this.ownerDocument = document; }
  get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
}

function simpleMatch(node, selector) {
  const attributes = [...selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
  const bare = selector.replace(/\[[^\]]+\]/g, '');
  const tag = bare.match(/^[\w-]+/)?.[0];
  if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  const id = bare.match(/#([\w-]+)/)?.[1];
  if (id && node.id !== id) return false;
  if ([...bare.matchAll(/\.([\w-]+)/g)].some(([, name]) => !node.classList.contains(name))) return false;
  return attributes.every(([, name, value]) => node.hasAttribute(name) && (value === undefined || node.getAttribute(name) === value));
}

export class Element {
  nodeType = 1;
  _children = [];
  attributes = new Map();
  listeners = new Map();
  value = '';
  scrollTop = 0;
  constructor(tag, document) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = document;
    this.dataset = new Proxy({}, {
      get: (_, name) => this.getAttribute('data-' + name.replace(/[A-Z]/g, char => '-' + char.toLowerCase())) ?? undefined,
      set: (_, name, value) => { this.setAttribute('data-' + name.replace(/[A-Z]/g, char => '-' + char.toLowerCase()), value); return true; },
      deleteProperty: (_, name) => { this.removeAttribute('data-' + name.replace(/[A-Z]/g, char => '-' + char.toLowerCase())); return true; },
    });
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: name => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), name])].join(' '); },
      remove: name => { this.className = this.className.split(/\s+/).filter(value => value !== name).join(' '); },
    };
  }
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }
  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(value) { value ? this.setAttribute('hidden', '') : this.removeAttribute('hidden'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { value ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
  get open() { return this.hasAttribute('open'); }
  set open(value) { value ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
  get children() { return this._children.filter(node => node.nodeType === 1); }
  get childElementCount() { return this.children.length; }
  get firstElementChild() { return this.children[0] || null; }
  get nextElementSibling() {
    const siblings = this.parentElement?.children || [];
    return siblings[siblings.indexOf(this) + 1] || null;
  }
  get textContent() { return this._children.map(node => node.textContent).join(''); }
  set textContent(value) { this.replaceChildren(String(value)); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) {
    for (let node of nodes) {
      if (typeof node !== 'object') node = new TextNode(String(node), this.ownerDocument);
      if (node.parentNode) node.parentNode._children.splice(node.parentNode._children.indexOf(node), 1);
      node.parentNode = this;
      this._children.push(node);
    }
  }
  replaceChildren(...nodes) {
    for (const node of this._children) node.parentNode = null;
    this._children = [];
    this.append(...nodes);
  }
  replaceWith(...nodes) {
    const parent = this.parentNode;
    if (!parent) return;
    const position = parent._children.indexOf(this);
    const replacements = nodes.map(node => typeof node === 'object' ? node : new TextNode(String(node), this.ownerDocument));
    for (const node of replacements) node.parentNode = parent;
    parent._children.splice(position, 1, ...replacements);
    this.parentNode = null;
  }
  matches(selector) {
    return selector.split(',').some(group => {
      const parts = group.trim().split(/\s+/);
      if (!simpleMatch(this, parts.pop())) return false;
      let ancestor = this.parentElement;
      while (parts.length) {
        const wanted = parts.pop();
        while (ancestor && !simpleMatch(ancestor, wanted)) ancestor = ancestor.parentElement;
        if (!ancestor) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
  }
  querySelectorAll(selector) {
    const result = [];
    const visit = node => { for (const child of node.children) { if (child.matches(selector)) result.push(child); visit(child); } };
    visit(this);
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  dispatch(type, fields = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...fields };
    for (const callback of this.listeners.get(type) || []) callback(event);
    return event;
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  getClientRects() {
    let current = this;
    while (current) {
      if (current.hidden || (current.tagName === 'DIALOG' && !current.open)) return [];
      current = current.parentElement;
    }
    return [{}];
  }
  focus() { if (!this.disabled && this.getClientRects().length) this.ownerDocument.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatch('close'); }
}

export function createDocument(html = '') {
  const document = {
    activeElement: null,
    createElement(tag) { return new Element(tag, this); },
    getElementById(id) { return this.body.querySelector('#' + id); },
  };
  document.body = document.createElement('body');
  const append = (parent, nodes) => {
    for (const source of nodes) {
      if (source.type === 'text') { parent.append(source.data); continue; }
      if (!source.name) continue;
      const node = document.createElement(source.name);
      for (const [name, value] of Object.entries(source.attribs || {})) node.setAttribute(name, value);
      append(node, source.children || []);
      parent.append(node);
    }
  };
  append(document.body, parseDocument(html).children);
  return document;
}
