// 入口：装配样式与控制器。
import './styles/tokens.css';
import './styles/base.css';
import './styles/machine.css';
import './styles/controls.css';
import './styles/responsive.css';
import './styles/motion.css';
import { MachineController } from './ui/machine';

const app = document.getElementById('app');
if (app) {
  new MachineController().mount(app);
}
