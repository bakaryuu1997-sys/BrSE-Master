/**
 * Romaji to Kana (Hiragana/Katakana) Converter
 * Specifically designed to parse Google Translate's Romanized transliterations.
 */

const ROMAJI_TO_HIRAGANA = {
  'tsu': 'つ', 'chi': 'ち', 'shi': 'し',
  'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
  'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'cho', // will fix cho below
  'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
  'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
  'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
  'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
  'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
  'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
  'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
  'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
  'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
  
  'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
  'sa': 'さ', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
  'ta': 'た', 'ti': 'ち', 'tu': 'つ', 'te': 'て', 'to': 'と',
  'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
  'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
  'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
  'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
  'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
  'wa': 'わ', 'wo': 'を', 'nn': 'ん',
  
  'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
  'za': 'ざ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
  'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'đ', // will fix below
  'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
  'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  
  'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お', 'n': 'ん'
};

// Fix minor string mappings
ROMAJI_TO_HIRAGANA['cho'] = 'ちょ';
ROMAJI_TO_HIRAGANA['de'] = 'で';
ROMAJI_TO_HIRAGANA['do'] = 'ど';

const HIRAGANA_TO_KATAKANA = {
  'あ': 'ア', 'い': 'イ', 'う': 'ウ', 'え': 'エ', 'お': 'オ',
  'か': 'カ', 'き': 'キ', 'く': 'ク', 'け': 'ケ', 'こ': 'コ',
  'さ': 'サ', 'し': 'シ', 'す': 'ス', 'せ': 'セ', 'そ': 'ソ',
  'た': 'タ', 'ち': 'チ', 'つ': 'ツ', 'て': 'テ', 'と': 'ト',
  'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
  'は': 'ハ', 'ひ': 'ヒ', 'ふ': 'フ', 'へ': 'ヘ', 'ほ': 'ホ',
  'ま': 'マ', 'mi': 'ミ', // will fix below
  'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
  'や': 'ヤ', 'ゆ': 'ユ', 'よ': 'ヨ',
  'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
  'わ': 'ワ', 'を': 'ヲ', 'ん': 'ン',
  'が': 'ガ', 'ぎ': 'ギ', 'ぐ': 'グ', 'げ': 'ゲ', 'ご': 'ゴ',
  'ざ': 'ザ', 'じ': 'ジ', 'ず': 'ズ', 'ぜ': 'ゼ', 'ぞ': 'ゾ',
  'だ': 'ダ', 'ぢ': 'ヂ', 'づ': 'ヅ', 'で': 'デ', 'ど': 'ド',
  'ba': 'バ', // will fix below
  'ば': 'バ', 'び': 'ビ', 'ぶ': 'ブ', 'べ': 'ベ', 'ぼ': 'ボ',
  'ぱ': 'パ', 'ぴ': 'ピ', 'ぷ': 'プ', 'ぺ': 'ペ', 'ぽ': 'ポ',
  'しゃ': 'シャ', 'しゅ': 'シュ', 'しょ': 'ショ',
  'ちゃ': 'チャ', 'ちゅ': 'チュ', 'ちょ': 'チョ',
  'じゃ': 'ジャ', 'じゅ': 'ジュ', 'じょ': 'ジョ',
  'きゃ': 'キャ', 'きゅ': 'キュ', 'きょ': 'キョ',
  'gi': 'ギ', // will fix below
  'ぎゃ': 'ギャ', 'ぎゅ': 'ギュ', 'ぎょ': 'ギョ',
  'にゃ': 'ニャ', 'にゅ': 'ニュ', 'にょ': 'ニョ',
  'ひゃ': 'ヒャ', 'ひゅ': 'ヒュ', 'ひょ': 'ヒョ',
  'びゃ': 'ビャ', 'びゅ': 'ビュ', 'びょ': 'ビョ',
  'ぴゃ': 'ピャ', 'ぴゅ': 'ピュ', 'ぴょ': 'ピョ',
  'みゃ': 'ミャ', 'みゅ': 'ミュ', 'みょ': 'ミョ',
  'りゃ': 'リャ', 'りゅ': 'リュ', 'りょ': 'リョ'
};

// Fix minor mapping bugs in HIRAGANA_TO_KATAKANA
delete HIRAGANA_TO_KATAKANA['mi'];
delete HIRAGANA_TO_KATAKANA['ba'];
delete HIRAGANA_TO_KATAKANA['gi'];

export function romajiToKana(romaji, originalText = "") {
  if (!romaji) return "";
  
  // Clean raw romaji from Google (remove HTML, lowercase)
  let clean = romaji.toLowerCase().trim()
    .replace(/o\^/g, 'ō')
    .replace(/u\^/g, 'ū');

  // Determine if it is a Katakana word
  const isKatakanaWord = /[\u30A0-\u30FF]/.test(originalText) || 
                         /(rūtingu|rūtā|konsōru|inter-fēsu|indekusu|pēji|saido-paneru|kodokku)/i.test(romaji);

  // Normalize long vowels based on writing style
  if (isKatakanaWord) {
    clean = clean
      .replace(/ā/g, 'aー')
      .replace(/ī/g, 'iー')
      .replace(/ū/g, 'uー')
      .replace(/ē/g, 'eー')
      .replace(/ō/g, 'oー');
  } else {
    // Natural Hiragana long vowels spelling
    clean = clean
      .replace(/ā/g, 'aa')
      .replace(/ī/g, 'ii')
      .replace(/ū/g, 'uu')
      .replace(/ē/g, 'ei')
      .replace(/ō/g, 'ou');
  }

  let result = "";
  let i = 0;
  
  while (i < clean.length) {
    // 1. Skip non-latin letters
    if (!/[a-z\^ー\-]/.test(clean[i])) {
      result += clean[i];
      i++;
      continue;
    }

    // 2. Handle Katakana prolonging mark
    if (clean[i] === 'ー' || clean[i] === '-') {
      result += 'ー';
      i++;
      continue;
    }

    // 3. Handle double consonants (促音 - sokuon, e.g. "tt", "kk", "ss")
    if (clean[i] === clean[i+1] && clean[i] !== 'n' && /[a-z]/.test(clean[i])) {
      result += 'っ';
      i++;
      continue;
    }

    // 4. Try matching syllables of length 3, 2, then 1
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      if (i + len <= clean.length) {
        let chunk = clean.substring(i, i + len);
        if (ROMAJI_TO_HIRAGANA[chunk]) {
          result += ROMAJI_TO_HIRAGANA[chunk];
          i += len;
          matched = true;
          break;
        }
      }
    }

    // If not matched, just append as-is
    if (!matched) {
      result += clean[i];
      i++;
    }
  }

  if (isKatakanaWord) {
    let katakanaResult = "";
    let j = 0;
    while (j < result.length) {
      let char = result[j];
      // Match 2 chars (e.g. しゃ, ちょ)
      if (j + 1 < result.length && HIRAGANA_TO_KATAKANA[result.substring(j, j + 2)]) {
        katakanaResult += HIRAGANA_TO_KATAKANA[result.substring(j, j + 2)];
        j += 2;
      } else if (HIRAGANA_TO_KATAKANA[char]) {
        katakanaResult += HIRAGANA_TO_KATAKANA[char];
        j++;
      } else {
        katakanaResult += char;
        j++;
      }
    }
    return katakanaResult;
  }

  return result;
}
