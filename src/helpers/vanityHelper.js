const MAX_SUFFIX_LENGTH = Number(process.env.MAX_SUFFIX_LENGTH || 10);
const MAX_COMBINATIONS = Number(process.env.MAX_COMBINATIONS || 3000);
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 5);

// Unified constants for scoring weight
const PREFERRED_WORD_BASE_SCORE = 100;
const ENDS_WITH_BONUS = 50;

//Convert word to its keypad # sequence. (e.g., "ABC" -> "222")
const wordToDigits = (word = '', letterToDigit = {}) => {
    return word.toUpperCase().split('').map(letter => letterToDigit[letter]).join('');
};

//recursive function to generate every possible combination of letter from numbers
const getCombinations = (digits, digitToLetters, limit = MAX_COMBINATIONS) => {
    const results = [];

    const generate = (index, current) => {
        if (results.length >= limit) return;

        // if reaches the end of digits string, record the finished variation
        if (index === digits.length) {
            results.push(current);
            return;
        }

        const digit = digits[index];
        const letters = digitToLetters[digit] || [];

        // if digit has no letter bindings (e.g '0' or '1'), append number
        if (!letters || letters.length === 0) {
            generate(index + 1, current + digit);
            return;
        }

        letters.forEach(letter => generate(index + 1, current + letter)); //loop all possible letters
    };

    generate(0, '');
    return results;
};


const formatVanityNumber = (digits, vanitySuffix) => {
    const suffixLength = vanitySuffix.length;
    
    // clean out non-digits from input just in case
    const rawDigits = digits.replace(/\D/g, '');

    // Handle 11-digit numbers starting with 1 (e.g., 18005551234)
    if (rawDigits.length === 11 && rawDigits.startsWith('1')) {
        const areaCode = rawDigits.slice(1, 4);
        
        // The remaining 7 digits must combine into the exchange + line space
        const localDigits = rawDigits.slice(4); // e.g., "5551234"
        
        // Leave the left side as numeric digits, replace the right side with the vanity letters
        const numericPart = localDigits.slice(0, 7 - suffixLength); 
        
        if (numericPart.length >= 3) {
            // e.g., 1-800-555-HELP (word length 4, numeric part length 3)
            return `1-${areaCode}-${numericPart.slice(0, 3)}-${numericPart.slice(3)}${vanitySuffix}`;
        } else {
            // e.g., 1-800-FLOWERS (word length 7, numeric part length 0)
            const combinedLocal = `${numericPart}${vanitySuffix}`;
            return `1-${areaCode}-${combinedLocal.slice(0, 3)}-${combinedLocal.slice(3)}`;
        }
    }

    // Handle standard 10-digit numbers (e.g., 8005551234)
    if (rawDigits.length === 10) {
        const areaCode = rawDigits.slice(0, 3);
        const localDigits = rawDigits.slice(3); // "5551234"
        
        const numericPart = localDigits.slice(0, 7 - suffixLength);
        
        if (numericPart.length >= 3) {
            return `${areaCode}-${numericPart.slice(0, 3)}-${numericPart.slice(3)}${vanitySuffix}`;
        } else {
            const combinedLocal = `${numericPart}${vanitySuffix}`;
            return `${areaCode}-${combinedLocal.slice(0, 3)}-${combinedLocal.slice(3)}`;
        }
    }

    // fallback for any non-standard lengths
    const prefixLength = rawDigits.length - suffixLength;
    return `${rawDigits.slice(0, prefixLength)}-${vanitySuffix}`;
};


const scoreVanity = (vanity, preferredWords) => {
    let score = 0;

    //Check for preferred word matches
    preferredWords.forEach((word) => {
        if (vanity.includes(word)) {
            score += word.length * PREFERRED_WORD_BASE_SCORE; // longer word high pts (e.g., 4 letters * 100 = 400 pts)
            
            if (vanity.endsWith(word)) {
                score += ENDS_WITH_BONUS; // additional pts if the word is at the end (e.g., 1-800-555-HELP)
            }
        }
    });
    
    const letterCount = vanity.replace(/[^A-Z]/g, '').length;
    score += letterCount; // Bonus points for letter count

    const hasLongLetter = /[A-Z]{5,}/.test(vanity);
    if (hasLongLetter) {
        score += 20; // Bonus for readability
    }

    const mixedDigitsAndLetters = /\d[A-Z]|[A-Z]\d/.test(vanity);
    if (mixedDigitsAndLetters) {
        score -= 15; // Penalty check: Deduct points for ugly alternating numbers and letters
    }

    return score;
};

// looks for explicit matches inside the local number string
const getWordCandidates = ({digits, preferredWords, digitToLetters}) => {
    const candidates = [];
    const cleanDigits = digits.replace(/\D/g, '');
    
    // For an 11-digit number (18001763342), prefix is 1800, local is 1763342
    const prefix = cleanDigits.slice(0, 4);
    const localDigits = cleanDigits.slice(4);

    preferredWords.forEach((word) => {
        // Translate the dictionary word back to keypad numbers
        const wordDigits = word.toUpperCase().split('').map(letter => {
            return Object.keys(digitToLetters).find(digit => 
                digitToLetters[digit].includes(letter)
            );
        }).join('');

        if (!wordDigits || wordDigits.length > localDigits.length) return;

        // If the local number string contains the translated digits anywhere
        if (localDigits.includes(wordDigits)) {
            // overlay the word directly onto the number pattern
            const vanityLocal = localDigits.replace(wordDigits, `-${word.toUpperCase()}-`);
            const cleanLocal = vanityLocal.replace(/--/g, '-').replace(/^-|-$/g, '');
            
            const formatted = prefix.startsWith('1') ? `1-${prefix.slice(1, 4)}-${cleanLocal}` : `${prefix}-${cleanLocal}`;

            candidates.push({
                vanityNumber: formatted,
                score: word.length * PREFERRED_WORD_BASE_SCORE // Longer matches rank higher
            });
        }
    });
    return candidates;
};

//generating random combinations based on remaining last numbers
const getGeneratedCandidates = ({digits,suffixDigits,digitToLetters,preferredWords}) => {
    const combinations = getCombinations(suffixDigits, digitToLetters, MAX_COMBINATIONS);

    return combinations.map((combination) => {
        const vanityNumber = formatVanityNumber(digits, combination);
        return {
            vanityNumber,
            score: scoreVanity(combination, preferredWords)
        };
    });
};

//filters out processing results with matching structural vanity string outputs
const removeDuplicates = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        if (seen.has(item.vanityNumber)) {
            return false;
        }
        seen.add(item.vanityNumber);
        return true;
    });
};

//Main function coordinating dictionary lookups and fallback generation steps
const getBestVanityNumbers = ({digits,digitToLetters, preferredWords}) => {
    const cleanDigits = digits.replace(/\D/g, '');

    //Scan for real preferred dictionary words anywhere inside the number string
    const wordCandidates = getWordCandidates({
        digits: cleanDigits,
        preferredWords,
        digitToLetters
    });

    //Remove overlapping duplicates and sort by string length score descending
    const sortedWordCandidates = removeDuplicates(wordCandidates)
        .sort((a, b) => b.score - a.score);

    // Critical Blocker Pattern. If the dictionary returns a full list of 5 matches,
    // skip the permutation fallback logic entirely to prevent random letter noise (e.g., "DDGA") from entering the results.
    if (sortedWordCandidates.length >= MAX_RESULTS) {
        return sortedWordCandidates.slice(0, MAX_RESULTS).map(item => item.vanityNumber);
    }

    // Only fill the rest of the array with permutations if dictionary matches < 5
    const fallbackSuffixLength = Math.min(4, cleanDigits.length);
    const fallbackSuffixDigits = cleanDigits.slice(-fallbackSuffixLength);

    const generatedCandidates = getGeneratedCandidates({
        digits: cleanDigits,
        suffixDigits: fallbackSuffixDigits,
        digitToLetters,
        preferredWords
    });

    // Combine them, ensuring real dictionary items stay pinned to the very top
    const allCandidates = [...sortedWordCandidates, ...generatedCandidates];
    
    return removeDuplicates(allCandidates)
        .slice(0, MAX_RESULTS)
        .map(item => item.vanityNumber);
};
    
module.exports = {
    getBestVanityNumbers
};