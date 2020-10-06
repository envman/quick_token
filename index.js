#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')

const [mode, source] = process.argv.slice(2)
const target_path = path.join(source, 'dist')

fs.mkdirpSync(target_path)

const values = {}

if (fs.existsSync(path.join(target_path, 'values'))) {
  fs.readFileSync(path.join(target_path, 'values'), 'utf-8')
    .split('\r\n')
    .map(val => {
      const [name, value] = val.split('=')
      values[name] = value
    })
}

const replace = folder => {
  return fs.readdir(path.join(source, folder))
    .then(files => {
      return Promise.all(files.map(f => fs.lstat(path.join(folder, f)).then(stats => ({ stats, path: f }))))
        .then(([...stats]) => {
          const folders = stats.filter(s => s.stats.isDirectory())
          const files = stats.filter(s => s.stats.isFile())

          const proms = []

          proms.push(...folders.filter(f => !f.path.includes('dist')).map(f => replace(path.join(folder, f.path))))
          proms.push(...files.filter(f => f.path.endsWith('.yml')).map(f => replace_file(path.join(folder, f.path))))

          return Promise.all(proms)
        }) 
    })
}
const scannedValues = []

const replace_file = local_path => {
  console.log('File: ', local_path)

  const bits = local_path.split('\\')
  bits.pop()

  const folder = path.join(target_path, bits.join('\\'))

  return fs.readFile(path.join(source, local_path), 'utf8')
    .then(data => {
      const res = [
        ...data.match(/__(\w+)__/g).filter(x => !x.startsWith('__BUILD')),
        ...data.match(/__BUILD__(\w+)__/g)
      ]

      let output = data
      if (!res) {
        return console.log('no tokens in file', local_path)
      }

      const variables = res.map(x => x.slice(2, x.length - 2))

      if (mode === 'scan') {
        scannedValues.push(...variables)
        return
      }

      if (mode === 'generate') {
        variables.map(x => {
          const replacement = values[x]

          if (!replacement) {
            console.error(`Could not find value for ${x}`)
          } else {
            output = output.split(`__${x}__`).join(replacement)
          }
        })

        const output_path = path.join(target_path, local_path)
        return fs.mkdirp(folder)
          .then(fs.writeFile(output_path, output))
      }
    })
}

replace(source)
  .then(_ => {
    if (mode === 'scan') {
      const output = scannedValues
        .filter((x, i) => scannedValues.indexOf(x) === i)
        .sort((a, b) => a.localeCompare(b))
        .map(x => {
          const value = values[x] || ''
          if (!value) console.log(`Value required ${x}`)

          return `${x}=${value}`
        }).join('\r\n')
      
      return fs.writeFile(path.join(target_path, 'values'), output)
    }
  })
  .then(_ => {
    console.log(`${mode} completed`)
  })
  .catch(console.error)