export const LEARN_PATH = '/learn/panchang-basics'
export const isPublicLearnPath = pathname => [LEARN_PATH, `${LEARN_PATH}/`, `${LEARN_PATH}/index.html`].includes(pathname)
