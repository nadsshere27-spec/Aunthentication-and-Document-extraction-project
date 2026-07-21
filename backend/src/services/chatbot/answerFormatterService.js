function formatAnswer(question, result) {
  if (result.unsupported) {
    return `I can't answer that yet — ${result.reason}`;
  }

  if (result.operation === 'count') {
    return `${result.count} record${result.count === 1 ? '' : 's'} found.`;
  }

  if (result.operation === 'find') {
    const n = result.docs.length;
    if (n === 0) return "No matching records found.";
    const preview = result.docs.slice(0, 5).map(d =>
      d.customerName ? `${d.customerName} - ${d.amount ?? ''}` : JSON.stringify(d)
    ).join('; ');
    return `Found ${n} record${n === 1 ? '' : 's'}: ${preview}${n > 5 ? ', ...' : ''}`;
  }

  if (result.operation === 'aggregate') {
    const n = result.docs.length;
    if (n === 0) return "No matching data found.";
    const preview = result.docs.slice(0, 5).map(d => JSON.stringify(d)).join('; ');
    return `Result: ${preview}`;
  }

  return "Here's what I found: " + JSON.stringify(result).slice(0, 300);
}

module.exports = { formatAnswer };