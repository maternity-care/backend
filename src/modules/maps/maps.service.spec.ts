import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GeocodeAddressQueryDto, OpenMapQueryDto } from './dto/map-query.dto';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

describe('MapsService', () => {
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => key === 'app.name' ? 'Maternity Care API' : 'http://localhost'),
  } as unknown as ConfigService;

  const providerResult = {
    lat: '10.7756',
    lon: '106.6871',
    display_name: 'Ho Chi Minh, Viet Nam',
    boundingbox: ['10', '11', '106', '107'],
    osm_type: 'relation',
    osm_id: 123,
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
    cache.get.mockClear();
    cache.set.mockClear();
  });

  // Vai tro: dam bao service tao URL OpenStreetMap dung toa do va encode tham so an toan.
  it('creates an encoded OpenStreetMap URL', () => {
    const service = new MapsService(config, cache);
    expect(service.createOpenMapUrl('10.7756', '106.6871', 15)).toBe(
      'https://www.openstreetmap.org/?mlat=10.7756&mlon=106.6871#map=15/10.7756/106.6871',
    );
  });

  // Vai tro: kiem tra default zoom khi client khong truyen muc phong to.
  it('uses zoom 16 when zoom is omitted', () => {
    const service = new MapsService(config, cache);

    expect(service.createOpenMapUrl('10.7756', '106.6871')).toContain('#map=16/10.7756/106.6871');
  });

  // Vai tro: dam bao cac ky tu dac biet trong input toa do khong pha cau truc URL.
  it('encodes special characters in coordinate values', () => {
    const service = new MapsService(config, cache);

    expect(service.createOpenMapUrl('10.7 + north', '106.6/east', 12)).toBe(
      'https://www.openstreetmap.org/?mlat=10.7%20%2B%20north&mlon=106.6%2Feast#map=12/10.7%20%2B%20north/106.6%2Feast',
    );
  });

  // Vai tro: dam bao geocode uu tien cache de giam so lan goi provider ben ngoai.
  it('returns a cached geocoding result without calling the provider', async () => {
    const cached = {
      latitude: '10.7756',
      longitude: '106.6871',
      displayName: 'Ho Chi Minh',
      boundingBox: [],
      osmType: 'relation',
      osmId: 1,
      mapUrl: 'map',
    };
    cache.get.mockResolvedValueOnce(cached);
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(new MapsService(config, cache).geocodeAddress('Ho Chi Minh')).resolves.toEqual(cached);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra luong goi provider lay toa do tu dia chi va ghi ket qua vao cache.
  it('geocodes an address and caches the normalized result', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [providerResult],
    } as Response);

    const result = await new MapsService(config, cache).geocodeAddress('Ho Chi Minh', 'vn');

    expect(result).toMatchObject({ latitude: '10.7756', longitude: '106.6871', osmId: 123 });
    expect(result.mapUrl).toBe('https://www.openstreetmap.org/?mlat=10.7756&mlon=106.6871#map=16/10.7756/106.6871');
    expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('maps:geocode:'), result, 86400);
  });

  // Vai tro: dam bao dia chi/countryCode duoc trim va chuan hoa truoc khi gui sang provider.
  it('normalizes address spaces and country code before calling provider', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [providerResult],
    } as Response);

    await new MapsService(config, cache).geocodeAddress('  123   Nguyen   Trai  ', ' VN ');

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('q')).toBe('123 Nguyen Trai');
    expect(url.searchParams.get('countrycodes')).toBe('vn');
  });

  // Vai tro: dam bao query geocode khong chen countrycodes khi client khong truyen countryCode.
  it('omits countrycodes parameter when country code is not provided', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [providerResult],
    } as Response);

    await new MapsService(config, cache).geocodeAddress('Clinic');

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.has('countrycodes')).toBe(false);
  });

  // Vai tro: dam bao request toi provider co Accept/User-Agent dung chuan dich vu map.
  it('sends provider headers required for JSON and User-Agent identification', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [providerResult],
    } as Response);

    await new MapsService(config, cache).geocodeAddress('Clinic');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Accept-Language': 'vi,en;q=0.8',
      'User-Agent': 'Maternity Care API/1.0 (http://localhost)',
    });
  });

  // Vai tro: dam bao cache loi doc khong lam hong geocode, service van fallback sang provider.
  it('falls back to provider when cache read fails', async () => {
    cache.get.mockRejectedValueOnce(new Error('redis down'));
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [providerResult],
    } as Response);

    await expect(new MapsService(config, cache).geocodeAddress('Clinic')).resolves.toMatchObject({
      latitude: '10.7756',
      longitude: '106.6871',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Vai tro: dam bao cache loi ghi khong lam fail request geocode da lay duoc ket qua.
  it('still returns geocoding result when cache write fails', async () => {
    cache.set.mockRejectedValueOnce(new Error('redis write down'));
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [providerResult],
    } as Response);

    await expect(new MapsService(config, cache).geocodeAddress('Clinic')).resolves.toMatchObject({ osmId: 123 });
  });

  // Vai tro: chuan hoa loi network/provider thanh ServiceUnavailable de client biet dich vu map dang loi.
  it('returns service unavailable when provider fetch throws', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));

    await expect(new MapsService(config, cache).geocodeAddress('Clinic')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  // Vai tro: dam bao provider tra HTTP loi thi backend tra ServiceUnavailable thay vi success sai.
  it('returns service unavailable when provider returns non-2xx status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, status: 429 } as Response);

    await expect(new MapsService(config, cache).geocodeAddress('Clinic')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  // Vai tro: dam bao dia chi khong geocode duoc tra 404 ro rang.
  it('returns 404 when the address cannot be resolved', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => [] } as unknown as Response);

    await expect(new MapsService(config, cache).geocodeAddress('missing place')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: bao ve khi provider tra format bat thuong, khong coi do la ket qua hop le.
  it('returns 404 when provider response is not an array', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ error: 'bad shape' }) } as Response);

    await expect(new MapsService(config, cache).geocodeAddress('Clinic')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('MapsController', () => {
  // Vai tro: dam bao controller boc response tao map URL dung message/data.
  it('wraps generated map URL response', () => {
    const service = { createOpenMapUrl: jest.fn().mockReturnValue('https://map.example') };
    const controller = new MapsController(service as any);

    expect(controller.createOpenMapUrl({ latitude: '10', longitude: '106', zoom: 15 })).toMatchObject({
      message: expect.any(String),
      data: { mapUrl: 'https://map.example' },
    });
    expect(service.createOpenMapUrl).toHaveBeenCalledWith('10', '106', 15);
  });

  // Vai tro: dam bao controller boc response geocode dung format cho FE.
  it('wraps geocoding response', async () => {
    const result = { latitude: '10', longitude: '106' };
    const service = { geocodeAddress: jest.fn().mockResolvedValue(result) };
    const controller = new MapsController(service as any);

    await expect(controller.geocodeAddress({ address: 'Clinic', countryCode: 'vn' })).resolves.toMatchObject({
      message: expect.any(String),
      data: result,
    });
    expect(service.geocodeAddress).toHaveBeenCalledWith('Clinic', 'vn');
  });
});

describe('Maps DTO validation', () => {
  // Vai tro: dam bao DTO open-map nhan query hop le va convert zoom ve number.
  it('accepts valid open-map query and converts zoom to number', async () => {
    const dto = plainToInstance(OpenMapQueryDto, {
      latitude: '10.7756',
      longitude: '106.6871',
      zoom: '17',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.zoom).toBe(17);
  });

  // Vai tro: dam bao DTO open-map bat loi toa do/zoom khong hop le.
  it('rejects open-map query with invalid latitude, longitude, and zoom', async () => {
    const dto = plainToInstance(OpenMapQueryDto, {
      latitude: '91',
      longitude: '181',
      zoom: '20',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['latitude', 'longitude', 'zoom']));
  });

  // Vai tro: dam bao DTO geocode trim address va viet thuong countryCode truoc khi service dung.
  it('trims geocode address and normalizes country code', async () => {
    const dto = plainToInstance(GeocodeAddressQueryDto, {
      address: '  Main   Clinic  ',
      countryCode: ' VN ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.address).toBe('Main Clinic');
    expect(dto.countryCode).toBe('vn');
  });

  // Vai tro: dam bao DTO geocode bat dia chi qua ngan va countryCode sai dinh dang.
  it('rejects geocode query with too-short address and invalid country code', async () => {
    const dto = plainToInstance(GeocodeAddressQueryDto, {
      address: 'ab',
      countryCode: 'v1',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['address', 'countryCode']));
  });
});
