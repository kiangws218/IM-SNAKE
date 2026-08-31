# Arcweave 导入待确认报告

- 节点：34
- 连接：39
- 可达节点：25
- 忽略的空段落：5
- 出口分布：0出口 6，1出口 20，多出口 8

## 待确认项

1. **unreachable**：{"code":"unreachable","elementId":"18da6fe8-a4e2-40d4-878b-632c2a0e1f98","title":""}
2. **unreachable**：{"code":"unreachable","elementId":"3bf88674-ad23-439d-83ef-1f704ffccc5e","title":"第一章"}
3. **unreachable**：{"code":"unreachable","elementId":"e9c7b701-5839-4608-845a-94ff126edc01","title":"关卡1"}
4. **unreachable**：{"code":"unreachable","elementId":"f2b48594-308c-4bbc-8630-9b4407dc0e37","title":""}
5. **unreachable**：{"code":"unreachable","elementId":"f03dcb36-1cad-4e96-8838-f58cf881565e","title":""}
6. **unreachable**：{"code":"unreachable","elementId":"a2436fff-6ba8-48e0-ac94-ef29736ba7b2","title":""}
7. **unreachable**：{"code":"unreachable","elementId":"e83578b5-bdee-47f3-8bb0-5d27bd1a0501","title":""}
8. **unreachable**：{"code":"unreachable","elementId":"552d28cc-3f39-41e4-a5a6-79f3e81063b5","title":""}
9. **unreachable**：{"code":"unreachable","elementId":"122af3fb-62dc-4be8-9749-4150ed585f16","title":""}

## 自动转换约定

- 每个非空 `<p>` 生成一个独立 pages 项；空 `<p>` 忽略但计数。
- 无标签连接保留为空标签，由运行时/作者决定自动继续。
- 多出口只保留连接数据，不猜测选项条件。
- 本报告和规范化 JSON 不会覆盖正式 story-data.js。
