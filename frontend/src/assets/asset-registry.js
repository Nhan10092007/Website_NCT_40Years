import logo from './assets/img/logo-truong.png';
import landscape from './assets/img/landscape.png';
import icons from './assets/img/icons.png';
import mapCanopy from './assets/img/map-canopy.png';
import mapFloor1 from './assets/img/map-floor1.png';
import mapGround from './assets/img/map-ground.png';
import avatarFB from './assets/img/avatar-f_b.png';
import avatarFW from './assets/img/avatar-f_w.png';
import avatarFY from './assets/img/avatar-f_y.png';
import avatarMB from './assets/img/avatar-m_b.png';
import avatarMW from './assets/img/avatar-m_w.png';
import avatarMY from './assets/img/avatar-m_y.png';
import trainWindow from './assets/video/train-window.mp4';
import classA from './assets/video/loc-classA.mp4';
import corridor from './assets/video/loc-corridor.mp4';
import gate from './assets/video/loc-gate.mp4';
import hsts from './assets/video/loc-hsts.mp4';
import lab from './assets/video/loc-lab.mp4';
import stairs from './assets/video/loc-stairs.mp4';
import statue from './assets/video/loc-statue.mp4';
import yard from './assets/video/loc-yard.mp4';

export const assets = {
  logo,
  landscape,
  icons,
  maps: { ground: mapGround, floor1: mapFloor1, canopy: mapCanopy },
  avatars: [avatarFB, avatarFW, avatarFY, avatarMB, avatarMW, avatarMY],
  videos: {
    train: trainWindow,
    'lop-hoc': classA,
    'hanh-lang': corridor,
    'cong-truong': gate,
    'phong-giam-thi': hsts,
    'phong-y-te': lab,
    'san-cau-long': stairs,
    'bon-cay': statue,
    'san-truong': yard,
  },
};

export function avatarFor(userId) {
  return assets.avatars[Math.abs(Number(userId) || 0) % assets.avatars.length];
}
