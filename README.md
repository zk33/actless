# actless
simple &amp; fast static website generator/cms based on wig



## initialize

```
npm install actless
$(npm bin)/actless init
```

## watch&build

```
gulp
```

## compile options

see `gulpfile.js` after `$(npm bin)/actless init`.

## defined gulp tasks

### `actless:sass`

compile SASS

### `actless:js`

compile JavaScript

### `actless:wig`

compile HTML with [wig](https://github.com/zk33/wig/)

### `actless:server`

run local test server

### `actless:compile`

compile SASS,JS,HTML(with wig) and prettify HTML

### `actless:compile-full`

`actless:compile` + icon font

### `actless:watch`

watch SASS,JS,HTML(with wig) and prettify source and compile all.

### `actless:watch-full`

`actless:watch` + watch icon font source

### `actless:default`

`actless:compile` + `actless:watch`

### `actless:full`

`actless:compile-full` + `actless:watch-full`
