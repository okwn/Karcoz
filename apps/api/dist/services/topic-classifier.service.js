const TOPIC_KEYWORDS = {
    Mathematics: ['algebra', 'geometry', 'calculus', 'equation', 'theorem', 'formula', 'derivative', 'integral', 'matrix', 'polynomial', 'quadratic', 'sqrt', ' fraction', 'decimal'],
    Physics: ['force', 'velocity', 'acceleration', 'energy', 'momentum', 'gravity', 'wave', 'frequency', 'wavelength', 'quantum', 'thermodynamics', 'entropy', 'relativity', 'mass', 'weight'],
    Chemistry: ['element', 'molecule', 'atom', 'reaction', 'bond', 'electron', 'proton', 'neutron', 'orbital', 'compound', 'periodic', 'acid', 'base', 'oxidation', 'reduction'],
    Biology: ['cell', 'organism', 'evolution', 'photosynthesis', 'respiration', 'protein', 'DNA', 'RNA', 'gene', 'enzyme', 'metabolism', 'ecosystem', 'species'],
    History: ['war', 'revolution', 'empire', 'dynasty', 'century', 'ancient', 'medieval', 'modern', 'civilization', 'independence', 'colonization'],
    Geography: ['country', 'capital', 'continent', 'river', 'mountain', 'ocean', 'climate', 'population', 'region', 'border'],
    Literature: ['author', 'poem', 'novel', 'theme', 'character', 'metaphor', 'narrative', 'fiction', 'genre', 'style'],
    ComputerScience: ['algorithm', 'programming', 'code', 'software', 'hardware', 'database', 'network', 'security', 'encryption', 'compiler', 'runtime', 'function', 'variable'],
    Law: ['constitution', 'amendment', 'statute', 'precedent', 'jurisdiction', 'plaintiff', 'defendant', 'litigation', 'verdict', 'court'],
    Economics: ['inflation', 'gdp', 'supply', 'demand', 'market', 'interest rate', 'fiscal', 'monetary', 'recession', 'unemployment'],
};
export async function classifyTopic(text) {
    await new Promise((r) => setTimeout(r, 50));
    const lowerText = text.toLowerCase();
    let bestTopic = 'General';
    let bestConfidence = 0;
    let bestSubtopic;
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        let matchCount = 0;
        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                matchCount++;
            }
        }
        const confidence = matchCount / keywords.length;
        if (confidence > bestConfidence && matchCount >= 2) {
            bestConfidence = confidence;
            bestTopic = topic;
            bestSubtopic = matchCount > 3 ? topic : undefined;
        }
    }
    return {
        topic: bestConfidence > 0 ? bestTopic : undefined,
        subtopic: bestSubtopic,
        confidence: bestConfidence,
    };
}
//# sourceMappingURL=topic-classifier.service.js.map