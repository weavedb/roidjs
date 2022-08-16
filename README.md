# RoidJS

RoidJS is a lightweight utility library to inject global states into React components. This is an improved successor to the [NextDapp](https://nextdapp.org) framework, which has been battle-tested for years on [large-scale production apps](https://hide.ac) with thousands of users.

## Install

```bash
yarn add roidjs
```

## Quick Guide

React components are sandboxed and have no access to shared global states, which makes it extra hard to build large-scale app. In most cases, setting up some heavy state management system such as [Redux](https://redux.js.org/) and [RxJS](https://rxjs.dev/) is necessary.

RoidJS removes such cumbersome setups and simply lets you inject global states into components.

It's powered by [RecoilJS](https://recoiljs.org/), and the global states are [atoms](https://recoiljs.org/docs/basic-tutorial/atoms) and [selectors](https://recoiljs.org/docs/basic-tutorial/selectors) underneath.

```jsx
import { Roid, inject } from "roidjs"
import { useEffect } from "react"

/* wrapped function gets `set`, `get`, `val`, `refs`, `fn`, `args` */
const add = ({set, get, val}) => {
    /* set(new_value, state_name) */
    set(get("state_1") + get("state_2") + val, "state_1")
    /* $.state_1 = 1 + 2 + 3, 6 + 2 + 3, 11 + 2 + 3, ... */
}

const Add = inject(
    ["state_1", "state_2"],
    ({$, set, fn}) => {
        /* wrap function with `fn` to make it reactive with global states */
        return <div onClick={() => fn(add(3))}>add</div>
    }
)

/* inject([state_names], Component) */
const App = inject(
    /* 
     * inject an array of global states with a "key" or {key, default}
     * if no default value is specified, the initial value will be `null`
     */
    ["state_1", {key: "state_2", default: 2}],
    
    /* injected component gets `$`. `set` and `fn` */
    ({$, set, fn}) => {
        return <>
            /* `$` to access global states */
            <div>{$.state_1}</div>
            <Add />
        </>
})

/* 
 * wrap a component with <Roid> to create a scope 
 * optionally, initial values can be pre-assigned with `defaults`
 */
default export () => <Roid defaults={state_1: 1}><App /></Roid>
```

## Example with NextJS

An example usage with an NextJS app.

### Wrap with `<Roid>` provider

Wrap the `<Component>` with `<Roid>` in `/pages/_app.js`.

Optionally, default values can be specified with `defaults` prop.

```jsx
import "../styles/globals.css"
import { Roid } from "roidjs"
function MyApp({ Component, pageProps }) {
  return (
    <Roid defaults={state_1: 1, state_2: "two"}>
      <Component {...pageProps} />
    </Roid>
  )
}
export default MyApp
```

`<Roid>` doesn't have to be in `_app.js`, you can wrap any component, have multiple `<Roid>` providers, or even nest `<Roid>` providers.

Each `<Roid>` scope has its own states unless `override` is explicitly set `false`. If `override` is `false`, the nested scope inherites and shares its global states with the parent.
```jsx
import { Roid } from "roidjs"

export default () => 
  <>
    <Roid>content 1</Roid>
    <Roid>
        <Roid>content 2</Roid>
        <Roid override={false}>content 3</Roid>
    </Roid>
  </>
```

### Inject global states into Component

`inject([states], Component)`

You can inject global sattes to a react component with an array of state names.

The component gets `$` and `set` in its `props`.

To access the values of injected global states, use `$`.

To set a new value, `set(new_value, state_name)`.

```jsx
import { inject } from "roidjs"

const App = inject(
    ["state_1", "state_2", "state_3"],
    ({$, set}) =>
        <div onClick={() => set(($.state_1 || 0) + 1, "state_1")}>
            {$.state_1}
        </div>    
)
```

You can specify initial values to global states by using [the Recoil syntax](https://recoiljs.org/docs/basic-tutorial/atoms) as is. You cannot override the default value if it has been already set somewhere else. In such cases, specified default values will be ignored.

```jsx
const App = inject(
    [{key: "state_1", default: 1}],
    Component 
)
```

A global state can be either [atom](https://recoiljs.org/docs/api-reference/core/atom), [selector](https://recoiljs.org/docs/api-reference/core/selector).

Use the same syntax as Recoil, except that you can pass a key to `get` an atom or a selecter in the selector's get function.

```jsx
const App = inject(
    [
        {key: "atom", default: 1},
        {key: "selector", get: ({get}) => get("atom") + 1}
    ],
    Component 
)
```

### Reactive Functions

Functions can be made reactive to global states by wrapping with `fn`.

```jsx
const add = ({set, get, val}) => set(get("state_1") + num, "state_1")

const App = inject(
    ["state_1"],
    ({$, fn}) =>
        <div onClick={() => fn(add)(1)}>{$.state_1}</div>    
)
```

`val` is a convenient shorthand for the first argument passed to the function.

```jsx
const add = ({set, get, val}) => set(get("state_1") + val, "state_1")
```

A better usage would be destructing the arguments.

```jsx
const add = ({set, get, val: {num1, num2}})
    => set(get("state_1") + num1 + num2, "state_1")

const App = inject(
    ["state_1"],
    ({$, fn}) =>
        <div onClick={() => fn(add)({num1: 1, num2: 2})}>{$.state_1}</div>    
)
```

You can chain reactive functions by wraping another function with `fn` within a reactive function.

```jsx
const multiply = ({set, get, val})
    => set(get("state_1") * val, "state_1")

const add_and_multiply = ({set, get, val, fn}){
    set(get("state_1") + val, "state_1")
    fn(multiply)(3)
}
```

### Global `refs`

Sometimes you need to share non-reactive objects between components and functions, but React doesn't have a built-in feature for that. The globally shared `refs` comes to resque.

```jsx
const getData = ({set, refs}) => set(refs.db.get("data"), "data")

const App = inject(
    ["data"],
    ({fn, refs}) =>{
        useEffect(()=>{
            refs.db = initializeDB() // some DB instance
        },[])
        return <div onClick={() => fn(getData)()}>get data</div>
    }
)
```

## Super Simple Todo App Tutorial

### Create Next App and Install RoidJS

```bash
npx create-next-app todos
cd todos
yarn add roidjs
```

### `/pages/index.js`

```jsx
import { useState } from "react"
import { Roid, inject } from "roidjs"

const addTask = ({ get, set, val: { task } }) =>
  set([...get("todos"), { id: Date.now(), task, done: false }], "todos")

const complete = ({ get, set, val: { todo } }) =>
  set(
    get("todos").map(v => (v.id !== todo.id ? v : { ...v, done: !v.done })),
    "todos"
  )

const App = inject(["todos"], ({ $, fn, get, set }) => {
  const [task, setTask] = useState("")
  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex" }}>
        <input value={task} onChange={e => setTask(e.target.value)} />
        <div
          onClick={() => fn(addTask)({ task })}
          style={{ marginLeft: "10px" }}
        >
          add task
        </div>
      </div>
      {$.todos.map(todo => (
        <div
          style={{ display: "flex", padding: "5px" }}
          onClick={() => fn(complete)({ todo })}
        >
          {todo.done ? "o" : "x"} : {todo.task}
        </div>
      ))}
    </div>
  )
})

export default () => (
  <Roid defaults={{ todos: [] }}>
    <App />
  </Roid>
)
```

That's it!
