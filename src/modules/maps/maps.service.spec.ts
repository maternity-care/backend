import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
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

  afterEach(() => {
    jest.restoreAllMocks();
    cache.get.mockResolvedValue(null);
  });

  it('creates an encoded OpenStreetMap URL', () => {
    const service = new MapsService(config, cache);
    expect(service.createOpenMapUrl('10.7756', '106.6871', 15)).toBe(
      'https://www.openstreetmap.org/?mlat=10.7756&mlon=106.6871#map=15/10.7756/106.6871',
    );
  });

  it('returns a cached geocoding result without calling the provider', async () => {
    const cached = {
      latitude: '10.7756', longitude: '106.6871', displayName: 'Hồ Chí Minh',
      boundingBox: [], osmType: 'relation', osmId: 1, mapUrl: 'map',
    };
    cache.get.mockResolvedValueOnce(cached);
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(new MapsService(config, cache).geocodeAddress('Hồ Chí Minh')).resolves.toEqual(cached);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('geocodes an address and caches the normalized result', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        lat: '10.7756', lon: '106.6871', display_name: 'Hồ Chí Minh, Việt Nam',
        boundingbox: ['10', '11', '106', '107'], osm_type: 'relation', osm_id: 123,
      }],
    } as Response);
    const result = await new MapsService(config, cache).geocodeAddress('Hồ Chí Minh', 'vn');
    expect(result).toMatchObject({ latitude: '10.7756', longitude: '106.6871', osmId: 123 });
    expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('maps:geocode:'), result, 86400);
  });

  it('returns 404 when the address cannot be resolved', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => [] } as unknown as Response);
    await expect(new MapsService(config, cache).geocodeAddress('Không tồn tại')).rejects.toBeInstanceOf(NotFoundException);
  });
});
