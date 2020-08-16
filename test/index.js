SysTrayModule = require('systray');
const SysTray = SysTrayModule.default

console.log('Hello World')

const items = [
  {
    title: "Exit",
    tooltip: null,
    checked: false,
    enabled: true,
    handler: (systray) => {
      systray.kill()
      closeServer()
    },
  },
]

const systray = new SysTray({
	menu: {
		// you should using .png icon in macOS/Linux, but .ico format in windows
		icon: "icon.png",
		title: "test",
		tooltip: "Test",
		items: items
	},
	debug: false,
	copyDir: true, // copy go tray binary to outside directory, useful for packing tool like pkg.
})

systray.onClick(action => {
  const index = action.seq_id
  const handler = items[index].handler
  if (handler) handler(systray)
})
