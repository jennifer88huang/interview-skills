# 一键安装

在小龙虾聊天窗口里发送这一条命令：

```text
/skill install git:jennifer88huang/interview-skills@main
```

安装完成后，直接说：

```text
我要面字节跳动后端工程师，帮我模拟面试
```

终端版 OpenClaw 请手动安装。当前 `openclaw skills` 命令只支持 `list`、`info`、`check`，没有 `install` 子命令。

```bash
# 在本仓库根目录运行
bash install-skill.sh https://github.com/jennifer88huang/interview-skills.git
```

等价的手动安装方式：

```bash
mkdir -p ~/.openclaw/skills
git clone https://github.com/jennifer88huang/interview-skills.git ~/.openclaw/skills/interview-skills
openclaw skills info interview-skills
openclaw skills list
```

这个仓库根目录已经包含 `SKILL.md`，OpenClaw 会把它作为 skill 入口加载。

如果已经安装过，更新时运行：

```bash
git -C ~/.openclaw/skills/interview-skills pull --ff-only
```
