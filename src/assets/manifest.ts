/** Bảng ánh xạ khóa -> đường dẫn asset duy nhất (design/assets.md). Code không hard-code đường dẫn. Thay file thật = đổi dòng ở đây. */
import destroyer from '../../design/art/destroyer_2d.svg';
import cruiser from '../../design/art/cruiser_2d.svg';
import submarine from '../../design/art/submarine_2d.svg';
import missile from '../../design/art/missile_2d.svg';
import carrier from '../../design/art/carrier_2d.svg';
import raider from '../../design/art/raider_2d.svg';
import escort from '../../design/art/escort_2d.svg';
import dreadnought from '../../design/art/dreadnought_2d.svg';
import shipDreadnought from './models/ship_dreadnought.glb?inline';
import wreckDreadnought from './models/wrecks/wreck_dreadnought.glb?inline';
import shipDestroyer from './models/ship_destroyer.glb?inline';
import shipCruiser from './models/ship_cruiser.glb?inline';
import shipSubmarine from './models/ship_submarine.glb?inline';
import shipMissile from './models/ship_missile.glb?inline';
import shipCarrier from './models/ship_carrier.glb?inline';
import shipRaider from './models/ship_raider.glb?inline';
import shipEscort from './models/ship_escort.glb?inline';
import dbCargo from './models/debris/debris_cargo.glb?inline';
import dbFunnel from './models/debris/debris_funnel.glb?inline';
import dbHull from './models/debris/debris_hullchunk.glb?inline';
import dbMast from './models/debris/debris_mast.glb?inline';
import dbPlate from './models/debris/debris_plate.glb?inline';
import dbRadome from './models/debris/debris_radome.glb?inline';
import dbSail from './models/debris/debris_sail.glb?inline';
import dbTurret from './models/debris/debris_turret.glb?inline';
import dbVls from './models/debris/debris_vls.glb?inline';
import dbWing from './models/debris/debris_wing.glb?inline';
import wreckDestroyer from './models/wrecks/wreck_destroyer.glb?inline';
import wreckCruiser from './models/wrecks/wreck_cruiser.glb?inline';
import wreckMissile from './models/wrecks/wreck_missile.glb?inline';
import wreckSubmarine from './models/wrecks/wreck_submarine.glb?inline';
import wreckCarrier from './models/wrecks/wreck_carrier.glb?inline';
import wreckRaider from './models/wrecks/wreck_raider.glb?inline';
import wreckEscort from './models/wrecks/wreck_escort.glb?inline';
import arena_hull_small from './models/arena/arena_hull_small.glb?inline';
import arena_hull_medium from './models/arena/arena_hull_medium.glb?inline';
import arena_hull_large from './models/arena/arena_hull_large.glb?inline';
import arena_weapon_heavy from './models/arena/arena_weapon_heavy.glb?inline';
import arena_weapon_cannon from './models/arena/arena_weapon_cannon.glb?inline';
import arena_weapon_howitzer from './models/arena/arena_weapon_howitzer.glb?inline';
import arena_weapon_torpedo from './models/arena/arena_weapon_torpedo.glb?inline';
import arena_weapon_missile from './models/arena/arena_weapon_missile.glb?inline';
import arena_weapon_rocket from './models/arena/arena_weapon_rocket.glb?inline';
import arena_weapon_autocannon from './models/arena/arena_weapon_autocannon.glb?inline';
import arena_weapon_mg from './models/arena/arena_weapon_mg.glb?inline';
import arena_proj_shell from './models/arena/arena_proj_shell.glb?inline';
import arena_proj_bullet from './models/arena/arena_proj_bullet.glb?inline';
import arena_proj_torpedo from './models/arena/arena_proj_torpedo.glb?inline';
import arena_proj_missile from './models/arena/arena_proj_missile.glb?inline';
import arena_proj_rocket from './models/arena/arena_proj_rocket.glb?inline';
import logoEmblem from '../../design/art/logo_emblem.svg';
import mapTruongSa from '../../design/art/map_truong_sa.svg';
import mapHaiPhong from '../../design/art/map_hai_phong.svg';

export const manifest = {
  ui_ship_destroyer: destroyer,
  ui_ship_cruiser: cruiser,
  ui_ship_submarine: submarine,
  ui_ship_missile: missile,
  ui_ship_carrier: carrier,
  ui_ship_raider: raider,
  ui_ship_escort: escort,
  ui_ship_dreadnought: dreadnought,
  ship_destroyer: shipDestroyer, ship_cruiser: shipCruiser, ship_submarine: shipSubmarine, ship_missile: shipMissile,
  ship_carrier: shipCarrier, ship_raider: shipRaider, ship_escort: shipEscort, ship_dreadnought: shipDreadnought,
  debris_cargo: dbCargo, debris_funnel: dbFunnel, debris_hullchunk: dbHull, debris_mast: dbMast, debris_plate: dbPlate,
  debris_radome: dbRadome, debris_sail: dbSail, debris_turret: dbTurret, debris_vls: dbVls, debris_wing: dbWing,
  wreck_destroyer: wreckDestroyer, wreck_cruiser: wreckCruiser, wreck_missile: wreckMissile, wreck_submarine: wreckSubmarine, wreck_carrier: wreckCarrier, wreck_raider: wreckRaider, wreck_escort: wreckEscort, wreck_dreadnought: wreckDreadnought,
  arena_hull_small: arena_hull_small, arena_hull_medium: arena_hull_medium, arena_hull_large: arena_hull_large, arena_weapon_heavy: arena_weapon_heavy, arena_weapon_cannon: arena_weapon_cannon, arena_weapon_howitzer: arena_weapon_howitzer, arena_weapon_torpedo: arena_weapon_torpedo, arena_weapon_missile: arena_weapon_missile, arena_weapon_rocket: arena_weapon_rocket, arena_weapon_autocannon: arena_weapon_autocannon, arena_weapon_mg: arena_weapon_mg, arena_proj_shell: arena_proj_shell, arena_proj_bullet: arena_proj_bullet, arena_proj_torpedo: arena_proj_torpedo, arena_proj_missile: arena_proj_missile, arena_proj_rocket: arena_proj_rocket,
  ui_logo_emblem: logoEmblem,
  ui_map_truong_sa: mapTruongSa,
  ui_map_hai_phong: mapHaiPhong,
  // Chưa có file thật (placeholder bằng mã): fx_*, tex_fx_atlas, tex_env_night_harbor, tex_city_windows, âm thanh.
} as const;

export type AssetKey = keyof typeof manifest;
