import * as React from "react"
import {
  RecoilRoot,
  atom,
  atomFamily,
  selector,
  selectorFamily,
  useRecoilState,
} from "recoil"

import { useEffect } from "react"
import { is, isNil, mergeLeft, append, has } from "ramda"

let atoms = {}
let global = {}
let path = atom({
  key: "__provider_path",
  default: [],
})

export const Roid = ({ children, defaults, override = true }) => {
  const Path = ({ children }) => {
    if (isNil(atoms)) atoms = {}
    for (let k in defaults || {}) {
      if (isNil(atoms[k])) {
        atoms[k] = atom({
          key: k,
          default: defaults[k],
        })
      }
    }
    return children
  }
  return (
    <RecoilRoot {...{ override }}>
      <Path {...{ children }} />
    </RecoilRoot>
  )
}

const Injection = ({ children, _atoms, Component }) => {
  let $ = {}
  let setters = {}
  let _ = {}
  let updated = {}
  for (let v of _atoms || []) {
    let key
    let _default = null
    let _atom = null
    if (is(Object)(v) && has("id")(v)) {
      key = v.key
      if (has("get")(v)) {
        const _get = v.get
        v.get = id => ({ get }) =>
          _get(id)({
            get: v2 =>
              !isNil(atoms[v2]) && is(String)(v2) ? get(atoms[v2]) : get(v2),
          })
        if (isNil(atoms[key])) atoms[key] = selectorFamily(v)
      } else {
        if (isNil(atoms[key])) atoms[key] = atomFamily(v)
      }
      _atom = atoms[key](v.id)
    } else if (is(Object)(v) && has("get")(v)) {
      key = v.key
      const _get = v.get
      v.get = ({ get }) =>
        _get({
          get: v2 =>
            !isNil(atoms[v2]) && is(String)(v2) ? get(atoms[v2]) : get(v2),
        })
      if (isNil(atoms[key])) atoms[key] = selector(v)
      _atom = atoms[key]
    } else {
      const res = is(Object)(v) ? v : { key: v, default: null }
      key = res.key
      if (isNil(atoms[key])) {
        atoms[key] = atom({
          key,
          default: _default,
        })
      }
      _atom = atoms[key]
    }
    const [val, set] = useRecoilState(_atom)
    if (is(Object)(v) && has("id")(v)) {
      if (isNil($[key])) $[key] = {}
      $[`${key}.${v.id}`] = val
      setters[`${key}.${v.id}`] = set
    } else {
      $[key] = val
      setters[key] = set
    }
  }

  const get = key =>
    typeof updated[key] !== "undefined" ? updated[key] : $[key]

  const set = (val, key) => {
    updated[key] = val
    setters[key](val)
  }

  const fn = func => (...args) => {
    func({ val: args, get, set, global, fn })
  }

  return <Component {...{ $, set, fn, get }} />
}

export const inject = (atoms, Component) => () => (
  <Injection {...{ _atoms: atoms, Component }} />
)
