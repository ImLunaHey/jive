export const getDate = (): `${number}${number}${number}${number}-${number}${number}-${number}${number}` => {
    const today = new Date();
    const year = today.getFullYear().toString() as `${number}${number}${number}${number}`;
    const month = String(today.getMonth() + 1).padStart(2, '0') as `${number}${number}`;
    const day = String(today.getDate()).padStart(2, '0') as `${number}${number}`;
    return `${year}-${month}-${day}`;
};
