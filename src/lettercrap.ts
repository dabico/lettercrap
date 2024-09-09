/*!
 * @licence MIT (https://lettercrap.github.io/lettercrap/LICENSE)
 * @author Ozren Dabić
 * @author Davide Ciulla
 */

/**
 * Default settings for Lettercrap.
 *
 * @since 1.0.0
 */
export type Config = {
  content: string;
  letters: string;
  words: string[];
  font_family: string;
  font_weight: (typeof fontWeights)[number];
  update_interval: number;
};

const config: Config = {
  content: 'LETTERCRAP',
  letters: '01',
  words: [],
  font_family: 'monospace',
  font_weight: 'normal',
  update_interval: 150,
};

const style: Partial<CSSStyleDeclaration> = {
  padding: '0',
  fontFamily: 'monospace',
  fontSize: 'clamp(2px, 1vw, 1em)',
  lineHeight: '100%',
  whiteSpace: 'pre',
  overflow: 'hidden',
};

const fontWeights = [
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'lighter',
  'normal',
  'bold',
  'bolder',
];

/**
 * Configure the default settings for Lettercrap.
 *
 * @param userConfig - The user configuration to apply.
 * @throws Error - If the provided configuration contains invalid values.
 * @since 1.0.0
 */
export function configure(userConfig: Partial<Config>) {
  const cleanUserConfig = Object.fromEntries(Object.entries(userConfig).filter(([_key, val]) => val !== undefined));
  const preview = { ...config, ...cleanUserConfig };
  if (!isConfigValid(preview)) throw new Error('Invalid settings');
  const keys = Object.keys(preview) as (keyof Config)[];
  keys.forEach(<T extends keyof Config>(key: T) => (config[key] = userConfig[key] ?? config[key]));
}

const instances = new Map<HTMLDivElement, InitializedInstance>();

class InitializedInstance {
  intervalId: number;
  observer: ResizeObserver;

  constructor(intervalId: number, observer: ResizeObserver) {
    this.intervalId = intervalId;
    this.observer = observer;
  }

  destroy() {
    clearInterval(this.intervalId);
    this.observer.disconnect();
  }
}

/**
 * Re-render all initialized Lettercrap elements.
 * This is useful when synchronizing previously
 * initialized elements with the current configuration.
 *
 * @returns A promise that resolves when all elements have been refreshed.
 * @throws Error - If any of the elements can not be re-initialized.
 * @since 1.0.0
 * @see resetElements
 * @see initElements
 * @async
 */
export async function refresh() {
  const elements = Array.from(instances.keys());
  await resetElements(elements);
  await initElements(elements);
}

/**
 * Reset the specified element.
 *
 * @param element - The element to reset.
 * @returns A promise that resolves when the element has been reset.
 * @throws Error - If the specified element is not initialized.
 * @since 1.0.0
 * @async
 */
export async function resetElement(element: HTMLDivElement) {
  return new Promise<void>((resolve, reject) => {
    const metadata = instances.get(element);
    if (element instanceof Node && !!metadata) {
      metadata.destroy();
      instances.delete(element);
      element.textContent = null;
      element.style.height = '';
      resolve();
    } else if (!metadata) {
      const error = new Error('Element not initialized');
      reject(error);
    } else {
      const error = new Error('Input is not a Node instance');
      reject(error);
    }
  });
}

/**
 * Reset all specified elements.
 *
 * @param elements - The elements to reset.
 * @returns A promise that resolves when all elements have been reset.
 * @throws Error - If any of the specified elements are not initialized.
 * @since 1.0.0
 * @see resetElement
 * @async
 */
export async function resetElements(elements: HTMLDivElement[]) {
  return Promise.all(Array.from(elements).map(resetElement));
}

/**
 * Reset all initialized elements.
 *
 * @returns A promise that resolves when all elements have been reset.
 * @throws Error - If any of the elements can not be re-initialized.
 * @since 1.0.0
 * @see resetElements
 * @async
 */
export async function reset() {
  return resetElements(Array.from(instances.keys()));
}

/**
 * Initialize all Lettercrap elements.
 *
 * @returns A promise that resolves when all elements have been initialized.
 * @throws Error - If any of the elements can not be initialized.
 * @since 1.0.0
 * @see initElements
 * @async
 */
export async function init() {
  const elements = document.querySelectorAll<HTMLDivElement>('div[data-lettercrap], div[data-lettercrap-text]');
  return initElements(Array.from(elements));
}

/**
 * Initialize the specified elements.
 *
 * @param elements - The elements to initialize.
 * @returns A promise that resolves when all elements have been initialized.
 * @throws Error - If any of the elements can not be initialized.
 * @since 1.0.0
 * @see initElement
 * @async
 */
export async function initElements(elements: HTMLDivElement[]) {
  return Promise.all(Array.from(elements).map(initElement));
}

/**
 * Initialize the specified element.
 *
 * @param element - The element to initialize.
 * @returns A promise that resolves when the element has been initialized.
 * @throws Error - If the specified element can not be initialized.
 * @since 1.0.0
 * @async
 */
export async function initElement(element: HTMLDivElement) {
  if (instances.has(element)) return;
  Object.assign(element.style, style);

  if (element.hasAttribute('data-lettercrap-text')) {
    const text = element.getAttribute('data-lettercrap-text') ?? config.content;
    const font_family = element.getAttribute('data-lettercrap-font-family') ?? config.font_family;
    const font_weight = element.getAttribute('data-lettercrap-font-weight') ?? config.font_weight;
    if (!isStringNonBlank(text) || !isStringNonBlank(font_family) || !fontWeights.includes(font_weight)) {
      throw new Error('Invalid settings');
    }
    const svg = createSVG(text, font_family, font_weight);
    const data = await getImageData(svg);
    element.setAttribute('data-lettercrap', data.toString());
  }

  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const src = element.getAttribute('data-lettercrap');
    if (!src) throw new Error('No image data provided');
    image.crossOrigin = 'anonymous';
    image.src = src;
    image.onerror = reject;
    image.onload = () => {
      const metadata = render(element, image);
      instances.set(element, metadata);
      resolve();
    };
  });

  function createSVG(
    content: Config['content'],
    font_family: Config['font_family'],
    font_weight: Config['font_weight']
  ) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttributeNS(null, 'x', '50%');
    text.setAttributeNS(null, 'y', '50%');
    text.setAttributeNS(null, 'text-anchor', 'middle');
    text.setAttributeNS(null, 'dominant-baseline', 'central');
    text.setAttributeNS(null, 'font-family', font_family);
    text.setAttributeNS(null, 'font-weight', font_weight);
    text.textContent = content;
    svg.appendChild(text);
    document.body.appendChild(svg);
    const bounding_box = text.getBBox();
    document.body.removeChild(svg);
    const height = Math.round(bounding_box.height);
    const width = Math.round(bounding_box.width);
    svg.setAttributeNS(null, 'height', height.toString());
    svg.setAttributeNS(null, 'width', width.toString());
    return svg;
  }
}

async function getImageData(svg: SVGElement) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(svg);
    image.src = `data:image/svg+xml;base64,${btoa(serialized)}`;
    image.onerror = reject;
    image.onload = () => {
      const scale = 10;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      const widthAttr = svg.getAttribute('width');
      if (widthAttr === null) throw new Error('Invalid image width');
      const width = Number(widthAttr) * scale;
      const heightAttr = svg.getAttribute('height');
      if (heightAttr === null) throw new Error('Invalid image height');
      const height = Number(heightAttr) * scale;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL());
    };
  });
}

function render(element: HTMLDivElement, image: HTMLImageElement) {
  let text: string | undefined = undefined;
  const aspectAttr = parseFloat(element.getAttribute('data-lettercrap-aspect-ratio') ?? '0');
  const aspect = aspectAttr || image.height / image.width;
  resetText();

  const letters = (element.getAttribute('data-lettercrap-letters') ?? config.letters).trim();
  const words = element.getAttribute('data-lettercrap-words')?.split(' ') ?? config.words;
  const interval = parseInt(
    element.getAttribute('data-lettercrap-update-interval') ?? config.update_interval.toString()
  );
  if (!isStringNonBlank(letters) || !isArrayStringNonBlank(words) || !isNumberNonNegative(interval)) {
    throw new Error('Invalid settings');
  }
  const observer = new ResizeObserver(resetText);
  observer.observe(element);
  const id = setInterval(write(), interval);
  return new InitializedInstance(id, observer);

  function resetText() {
    text = undefined;
    const width = element.clientWidth;
    element.style.height = `${width * aspect}px`;
  }

  function write() {
    text = getTextContentWithImageAtSize(image, element, text, words, letters);
    element.textContent = text;
    return write;
  }
}

function getTextContentWithImageAtSize(
  image: HTMLImageElement,
  element: HTMLDivElement,
  existingText: string | undefined,
  words: string[],
  letters: string
) {
  existingText = existingText?.replace(/\r?\n|\r/g, '');
  const ratio = 1.61;
  const char_height = +getComputedStyle(element).fontSize.toString().slice(0, -2);
  const char_width = char_height / ratio;
  const parent_element_width = +getComputedStyle(element.parentElement!).width.toString().slice(0, -2);
  const factor = window.innerWidth / parent_element_width;

  const shouldReplaceWord = () => Math.random() < 0.05;
  const shouldReplaceExistingText = () => !existingText || Math.random() < 0.1;

  function randomChoice<T>(list: T[]) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const canvas = document.createElement('canvas');
  const { clientWidth: width, clientHeight: height } = element;
  canvas.width = width / char_width;
  canvas.height = height / char_height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  let chars = '';
  let start_of_filled_in_sequence: number | null = 0;
  let i = 0;

  for (const _y of Array(data.height).keys()) {
    for (const _x of Array(data.width).keys()) {
      const [r, g, b, a] = data.data.slice(i * 4, (i + 1) * 4);
      if (r === undefined || g === undefined || b === undefined || a === undefined) {
        throw new Error('Array index out of bound');
      }
      const black = r < 120;
      const transparent = a < 50;
      if (black && !transparent) {
        if (start_of_filled_in_sequence === null) start_of_filled_in_sequence = i;
        chars += shouldReplaceExistingText() ? randomChoice(letters.split('')) : existingText![i];
        if (words.length > 0 && shouldReplaceWord() && shouldReplaceExistingText()) {
          const word = randomChoice(words);
          if (word && i + 1 - start_of_filled_in_sequence >= word.length) {
            chars = chars.substring(0, chars.length - word.length) + word;
          }
        }
      } else {
        chars += ' ';
        start_of_filled_in_sequence = null;
      }
      i++;
    }
    chars += '\n';
    start_of_filled_in_sequence = null;
  }
  return chars;
}

function isStringNonBlank(str: string) {
  return str.trim().length > 0;
}

function isArrayStringNonBlank(arr: string[]) {
  return arr.every((word) => isStringNonBlank(word));
}

function isNumberNonNegative(num: number) {
  return num >= 0;
}

function isConfigValid(config: Config) {
  const validContent = isStringNonBlank(config.content);
  const validLetters = isStringNonBlank(config.letters);
  const validWords = isArrayStringNonBlank(config.words);
  const validUpdateInterval = isNumberNonNegative(config.update_interval);
  return validContent && validLetters && validWords && validUpdateInterval;
}
