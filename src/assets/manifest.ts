/** Bảng ánh xạ khóa -> đường dẫn asset duy nhất (design/assets.md). Code không hard-code đường dẫn. Thay file thật = đổi dòng ở đây. */
import destroyer from '../../design/art/destroyer_2d.svg';
import cruiser from '../../design/art/cruiser_2d.svg';
import submarine from '../../design/art/submarine_2d.svg';
import missile from '../../design/art/missile_2d.svg';
import carrier from '../../design/art/carrier_2d.svg';
import raider from '../../design/art/raider_2d.svg';
import escort from '../../design/art/escort_2d.svg';
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
  ship_destroyer: shipDestroyer, ship_cruiser: shipCruiser, ship_submarine: shipSubmarine, ship_missile: shipMissile,
  ship_carrier: shipCarrier, ship_raider: shipRaider, ship_escort: shipEscort,
  debris_cargo: dbCargo, debris_funnel: dbFunnel, debris_hullchunk: dbHull, debris_mast: dbMast, debris_plate: dbPlate,
  debris_radome: dbRadome, debris_sail: dbSail, debris_turret: dbTurret, debris_vls: dbVls, debris_wing: dbWing,
  ui_logo_emblem: logoEmblem,
  ui_map_truong_sa: mapTruongSa,
  ui_map_hai_phong: mapHaiPhong,
  // Chưa có file thật (placeholder bằng mã): fx_*, tex_fx_atlas, tex_env_night_harbor, tex_city_windows, âm thanh.
} as const;

export type AssetKey = keyof typeof manifest;
