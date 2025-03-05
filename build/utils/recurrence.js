import pkg from 'rrule';
const { rrulestr } = pkg;
/**
 * 检查重复日程是否在指定的时间区间内
 * @param recurrenceRule - RFC 5545 格式的重复规则字符串
 * @param eventTime - 事件的开始和结束时间（Unix 时间戳，单位：秒）
 * @param checkRange - 需要检查的时间区间（Unix 时间戳，单位：秒）
 * @returns boolean - 是否有重复事件在检查区间内
 */
export function isRecurrenceInRange(recurrenceRule, eventTime, checkRange) {
    try {
        // 如果重复规则为空，直接返回 false
        if (!recurrenceRule) {
            return false;
        }
        // 计算事件持续时间（秒）
        const eventDuration = eventTime.endTime - eventTime.startTime;
        // 将时间戳转换为 Date 对象
        const eventStart = new Date(eventTime.startTime * 1000);
        const checkStart = new Date(checkRange.startTime * 1000);
        const checkEnd = new Date(checkRange.endTime * 1000);
        // 解析重复规则
        // 注意：rrulestr 期望接收完整的 RRULE: 前缀
        const rruleString = recurrenceRule.startsWith('RRULE:')
            ? recurrenceRule
            : `RRULE:${recurrenceRule}`;
        const rule = rrulestr(rruleString, {
            dtstart: eventStart
        });
        // 获取检查区间内的所有重复日期
        const occurrences = rule.between(checkStart, checkEnd, true);
        // 检查是否有任何重复事件的时间范围与检查区间重叠
        return occurrences.some(occurrence => {
            const occurrenceStart = Math.floor(occurrence.getTime() / 1000);
            const occurrenceEnd = occurrenceStart + eventDuration;
            return (
            // 重复事件的开始时间在检查区间内
            (occurrenceStart >= checkRange.startTime &&
                occurrenceStart <= checkRange.endTime) ||
                // 重复事件的结束时间在检查区间内
                (occurrenceEnd >= checkRange.startTime &&
                    occurrenceEnd <= checkRange.endTime) ||
                // 重复事件完全包含检查区间
                (occurrenceStart <= checkRange.startTime &&
                    occurrenceEnd >= checkRange.endTime));
        });
    }
    catch (error) {
        console.error('Error checking recurrence:', error);
        return false;
    }
}
