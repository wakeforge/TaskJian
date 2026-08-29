// 原生应用菜单（简版）：
// - AppMenu（Mac 用 app.name，Win/Linux 用 "文件"）：关于 / 退出
// - EditMenu：复制 / 粘贴 / 全选
// - ViewMenu：切换开发者工具 / 全屏
// - WindowMenu：最小化 / 关闭
import { app, Menu, type MenuItemConstructorOptions } from 'electron';

export function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin';

  const appMenu: MenuItemConstructorOptions = isMac
    ? {
        label: app.name,
        submenu: [
          { role: 'about', label: '关于' },
          { type: 'separator' },
          { role: 'quit', label: '退出' },
        ],
      }
    : {
        label: '文件',
        submenu: [{ role: 'quit', label: '退出' }],
      };

  const template: MenuItemConstructorOptions[] = [
    appMenu,
    {
      label: '编辑',
      submenu: [
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}
