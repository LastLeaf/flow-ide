'use babel'

export const INIT_MESSAGE = 'Spawned flow server'
import score from 'sb-string_score'

export function geType(value) {
  return value.type && value.type.substr(0, 1) === '{' ? 'Object' : value.type || 'any'
}

export function toLinterMessages(contents) {
  if(contents.trim().length === 0) return []
  const parsed = JSON.parse(contents)
  if (parsed.passed) {
    return []
  }

  return parsed.errors.map(function(error) {
    const operation = error.message[0]
    const msgs = error.message.slice(1)
    const { trace, extraText } = toLinterTrace(msgs)
    const text = operation.descr + extraText

    return {
      type: error.level === 'error' ? 'Error' : 'Warning',
      filePath: operation.loc.source,
      range: toLinterRange(operation),
      text: text,
      trace: trace
    }
  })
}

function toLinterTrace(messages) {
  const toReturn = []
  const messagesCount = messages.length
  let prevMessage = ''

  for (let i = 0; i < messagesCount; ++i) {
    const value = messages[i]

    if (value.path) {
      toReturn.push({
        type: 'Trace',
        text: prevMessage + value.descr,
        filePath: value.path,
        range: toLinterRange(value)
      })
      prevMessage = ''
    } else {
      prevMessage += value.descr + ' '
    }

  }

  let extraText = ''
  if(toReturn.length) toReturn[toReturn.length - 1].text += ' ' + prevMessage
  else extraText = ' ' + prevMessage
  return {
    trace: toReturn,
    extraText
  }
}

function toLinterRange(item) {
  return [
    [item.line - 1, item.start - 1],
    [item.endline - 1, item.end]
  ]
}

export function toAutocompleteSuggestions(text, prefix) {
  const parsed = JSON.parse(text)
  const trimedPrefix = prefix.trim();
  const hasPrefix = trimedPrefix.length && trimedPrefix !== '.';
  const suggestions = parsed.result.map(function(suggestion) {
    const isFunction = suggestion.func_details !== null
    let text = null
    let snippet = null

    if (isFunction) {
      const parsedParams = []
      const params = suggestion.func_details.params
      let i = 0
      for (; i < params.length; ++i) {
        const value = params[i]
        const type = geType(value)
        parsedParams.push(`\${${i + 1}:${value.name}: ${type}}`)
      }
      snippet = suggestion.name + '(' + parsedParams.join(', ') + ')$' + (i + 1)
    } else {
      text = suggestion.name
    }

    return {
      text: text,
      snippet: snippet,
      leftLabel: isFunction ? 'function' : geType(suggestion),
      type: isFunction ? 'function' : 'property',
      replacementPrefix: hasPrefix ? prefix : '',
      score: hasPrefix ? score(suggestion.name, prefix) : 1
    }
  })
  return suggestions.sort(function(a, b) {
    return b.score - a.score
  }).filter(item => item.score)
}
