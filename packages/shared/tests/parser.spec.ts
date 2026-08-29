import { describe, it, expect } from 'vitest';
import { parseTaskText } from '../src/parser';
import { serializeTasks } from '../src/serializer';
import type { ParseResult } from '../src/index';

// 默认标签（PDF 指定）+ 样例中使用的 低（用户自定义标签）
const TAGS = ['紧急', '高', '中', '低'];

/** 抹平 id / 时间戳 / groupId 具体值，仅比较结构与文本字段，便于 round-trip 断言 */
function comparable(pr: ParseResult) {
  return {
    groups: pr.groups.map((g) => ({ name: g.name, order: g.order })),
    tasks: pr.tasks.map((t) => ({
      title: t.title,
      status: t.status,
      tags: t.tags,
      code: t.code ?? null,
      note: t.note ?? null,
      hasGroup: !!t.groupId,
      parentIdx: t.parentId
        ? pr.tasks.findIndex((x) => x.id === t.parentId!)
        : null,
    })),
    rootOrder: pr.rootOrder.map((id) => pr.tasks.findIndex((t) => t.id === id)),
    errorCount: pr.errors.length,
  };
}

describe('parseTaskText — 行级语法', () => {
  it('1. 单个待办任务：-高 测试任务', () => {
    const r = parseTaskText('-高 测试任务', TAGS);
    expect(r.tasks).toHaveLength(1);
    const t = r.tasks[0];
    expect(t.status).toBe('todo');
    expect(t.tags).toEqual(['高']);
    expect(t.title).toBe('测试任务');
    expect(t.parentId).toBeNull();
    expect(r.rootOrder).toEqual([t.id]);
  });

  it('2. 进行中任务带编号：=中 101: 国库支付', () => {
    const r = parseTaskText('=中 101: 国库支付', TAGS);
    const t = r.tasks[0];
    expect(t.status).toBe('progress');
    expect(t.tags).toEqual(['中']);
    expect(t.code).toBe('101');
    expect(t.title).toBe('国库支付');
  });

  it('3. 已完成任务：*紧急 完成', () => {
    const r = parseTaskText('*紧急 完成', TAGS);
    const t = r.tasks[0];
    expect(t.status).toBe('done');
    expect(t.tags).toEqual(['紧急']);
    expect(t.title).toBe('完成');
  });

  it('4. 受阻任务：▲低 阻塞', () => {
    const r = parseTaskText('▲低 阻塞', TAGS);
    const t = r.tasks[0];
    expect(t.status).toBe('blocked');
    expect(t.tags).toEqual(['低']);
    expect(t.title).toBe('阻塞');
  });

  it('5. 分组识别：【测试组】', () => {
    const r = parseTaskText('【测试组】', TAGS);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].name).toBe('测试组');
    expect(r.groups[0].order).toBe(0);
    expect(r.tasks).toHaveLength(0);
  });

  it('6. note 行：子行无前缀 → 父任务 note', () => {
    const r = parseTaskText('-高 父任务\n    这是备注', TAGS);
    expect(r.tasks).toHaveLength(1);
    expect(r.tasks[0].note).toBe('这是备注');
    expect(r.tasks[0].title).toBe('父任务');
  });

  it('7. 多层嵌套（3 层）树前缀 ├─ └─ │', () => {
    const r = parseTaskText('-高 根\n├─ -高 子1\n│   └─ -高 孙1', TAGS);
    expect(r.tasks).toHaveLength(3);
    const [root, c1, g1] = r.tasks;
    expect(root.parentId).toBeNull();
    expect(c1.parentId).toBe(root.id);
    expect(g1.parentId).toBe(c1.id);
    expect(r.rootOrder).toEqual([root.id]);
  });

  it('8. 纯缩进嵌套（4 空格）', () => {
    const r = parseTaskText('-高 根\n    -高 子', TAGS);
    expect(r.tasks).toHaveLength(2);
    const [root, child] = r.tasks;
    expect(child.parentId).toBe(root.id);
  });

  it('9. 多标签：-高 紧急 测试', () => {
    const r = parseTaskText('-高 紧急 测试', TAGS);
    const t = r.tasks[0];
    expect(t.tags).toEqual(['高', '紧急']);
    expect(t.title).toBe('测试');
  });

  it('10. 无前缀行降级为 todo', () => {
    const r = parseTaskText('测试任务', TAGS);
    const t = r.tasks[0];
    expect(t.status).toBe('todo');
    expect(t.tags).toEqual([]);
    expect(t.title).toBe('测试任务');
    expect(r.rootOrder).toEqual([t.id]);
  });

  it('11. 空行跳过', () => {
    const r = parseTaskText('-高 A\n\n   \n-高 B', TAGS);
    expect(r.tasks).toHaveLength(2);
    expect(r.tasks.map((t) => t.title)).toEqual(['A', 'B']);
  });

  it('12. 异常行不中断解析', () => {
    const r = parseTaskText('-高 A\n???随机\n-高 B', TAGS);
    expect(r.errors).toHaveLength(0);
    expect(r.tasks).toHaveLength(3);
    // 中间无前缀行降级为 todo
    expect(r.tasks[1].status).toBe('todo');
    expect(r.tasks[1].title).toBe('???随机');
  });

  it('额外. ✓ 前缀 → done（替代完成前缀）', () => {
    const r = parseTaskText('✓紧急 已完成', TAGS);
    expect(r.tasks[0].status).toBe('done');
    expect(r.tasks[0].tags).toEqual(['紧急']);
  });

  it('14. 空输入 → 空结果', () => {
    const r = parseTaskText('', TAGS);
    expect(r.groups).toHaveLength(0);
    expect(r.tasks).toHaveLength(0);
    expect(r.rootOrder).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
  });
});

describe('parseTaskText — PDF 主界面样例', () => {
  it('完整样例解析结构与设计稿一致', () => {
    const text = `【国库支付】
=中 101: 国库支付 - 中间业务
└─ 原始请求为每个字 …
-低 信创版本测试（联系南 …
└─ *紧急 其他流水凭证
-低 开始上云整理流程
├─ *紧急 测试云 V+ 测试报告
├─ *紧急 (已经开展) 渗透测试
├─ *紧急 云服务创建 +r紧急is
└─ -高 环境配置，下发申请`;
    const r = parseTaskText(text, TAGS);

    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].name).toBe('国库支付');
    expect(r.rootOrder).toHaveLength(3);

    const [a, b, c] = r.rootOrder.map((id) => r.tasks.find((t) => t.id === id)!);
    expect(a.title).toBe('国库支付 - 中间业务');
    expect(a.status).toBe('progress');
    expect(a.tags).toEqual(['中']);
    expect(a.code).toBe('101');
    expect(a.note).toBe('原始请求为每个字 …');

    expect(b.title).toBe('信创版本测试（联系南 …');
    expect(b.status).toBe('todo');
    expect(b.tags).toEqual(['低']);
    const bChild = r.tasks.find((t) => t.parentId === b.id);
    expect(bChild?.title).toBe('其他流水凭证');
    expect(bChild?.status).toBe('done');
    expect(bChild?.tags).toEqual(['紧急']);

    expect(c.title).toBe('开始上云整理流程');
    expect(c.status).toBe('todo');
    expect(c.tags).toEqual(['低']);
    const cChildren = r.tasks.filter((t) => t.parentId === c.id);
    expect(cChildren).toHaveLength(4);
    expect(cChildren.map((t) => t.title)).toEqual([
      '测试云 V+ 测试报告',
      '(已经开展) 渗透测试',
      '云服务创建 +r紧急is',
      '环境配置，下发申请',
    ]);
    expect(cChildren.map((t) => t.status)).toEqual([
      'done',
      'done',
      'done',
      'todo',
    ]);
  });
});

describe('round-trip：serialize → parse', () => {
  it('13. 序列化后再解析，结构一致', () => {
    const text = `【国库支付】
=中 101: 国库支付 - 中间业务
└─ 原始请求为每个字 …
-低 信创版本测试
└─ *紧急 其他流水凭证`;
    const pr1 = parseTaskText(text, TAGS);
    const serializ紧急 = serializeTasks(pr1.tasks, pr1.groups, pr1.rootOrder);
    const pr2 = parseTaskText(serializ紧急, TAGS);
    expect(comparable(pr2)).toEqual(comparable(pr1));
  });

  it('15. 深层嵌套 round-trip（3 层）', () => {
    const text = `-高 根
├─ -高 子1
│   └─ -高 孙1
└─ -高 子2`;
    const pr1 = parseTaskText(text, TAGS);
    const serializ紧急 = serializeTasks(pr1.tasks, pr1.groups, pr1.rootOrder);
    const pr2 = parseTaskText(serializ紧急, TAGS);
    expect(comparable(pr2)).toEqual(comparable(pr1));
    // 验证序列化后仍是 3 层结构
    const root = pr2.tasks.find((t) => t.parentId === null)!;
    const rootChildren = pr2.tasks.filter((t) => t.parentId === root.id);
    expect(rootChildren).toHaveLength(2);
    const grand = pr2.tasks.find(
      (t) => t.parentId === rootChildren[0].id,
    );
    expect(grand).toBeTruthy();
    expect(grand?.title).toBe('孙1');
  });

  it('15b. 纯缩进 round-trip', () => {
    const text = `-高 根
    -高 子
        -高 孙`;
    const pr1 = parseTaskText(text, TAGS);
    const serializ紧急 = serializeTasks(pr1.tasks, pr1.groups, pr1.rootOrder);
    const pr2 = parseTaskText(serializ紧急, TAGS);
    expect(comparable(pr2)).toEqual(comparable(pr1));
  });

  it('15c. 空数据 round-trip', () => {
    const pr1: ParseResult = {
      groups: [],
      tasks: [],
      rootOrder: [],
      errors: [],
    };
    const serializ紧急 = serializeTasks(pr1.tasks, pr1.groups, pr1.rootOrder);
    expect(serializ紧急).toBe('');
    const pr2 = parseTaskText(serializ紧急, TAGS);
    expect(comparable(pr2)).toEqual(comparable(pr1));
  });
});
