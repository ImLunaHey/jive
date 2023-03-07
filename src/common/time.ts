export const timeLength = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const weekMs = 7 * dayMs;
    const yearMs = 365 * dayMs;

    if (diffMs < minuteMs) {
        const seconds = Math.round(diffMs / 1000);
        return `${seconds} second${seconds === 1 ? '' : 's'}`;
    } else if (diffMs < hourMs) {
        const minutes = Math.round(diffMs / minuteMs);
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else if (diffMs < dayMs) {
        const hours = Math.round(diffMs / hourMs);
        return `${hours} hour${hours === 1 ? '' : 's'}`;
    } else if (diffMs < weekMs) {
        const days = Math.round(diffMs / dayMs);
        return `${days} day${days === 1 ? '' : 's'}`;
    } else if (diffMs < yearMs) {
        const weeks = Math.round(diffMs / weekMs);
        return `${weeks} week${weeks === 1 ? '' : 's'}`;
    } else {
        const years = Math.round(diffMs / yearMs);
        return `${years} year${years === 1 ? '' : 's'}`;
    }
}
