'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Wind, Thermometer, Eye, Navigation, CloudLightning, Info, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MainPageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { LayoutGrid, Layers, Map as MapIcon, Settings, Lock, MapPin } from 'lucide-react';

export default function WeatherPage() {
  const [icao, setIcao] = useState('');
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [tafData, setTafData] = useState<any | null>(null);
  const [avwxData, setAvwxData] = useState<any | null>(null);
  const [checkWxData, setCheckWxData] = useState<any | null>(null);
  const [mapLayer, setMapLayer] = useState<'radar' | 'satellite' | 'wind' | 'clouds' | 'rain' | 'temp' | 'vfr'>('radar');
  const [mapModel, setMapModel] = useState<'ecmwf' | 'gfs' | 'icon'>('ecmwf');
  const [showVfrMap, setShowVfrMap] = useState(false);
  const [showHeliports, setShowHeliports] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  const { toast } = useToast();

  const mapCoords = useMemo(() => {
    // Priority: METAR -> TAF -> Default (NYC)
    const lat = Number(weatherData?.lat ?? weatherData?.latitude ?? tafData?.lat ?? -25.9); // FALA approx
    const lon = Number(weatherData?.lon ?? weatherData?.longitude ?? tafData?.lon ?? 27.9);
    return {
      lat: Number.isFinite(lat) ? lat : -25.9,
      lon: Number.isFinite(lon) ? lon : 27.9,
    };
  }, [weatherData, tafData]);

  const windyEmbedUrl = useMemo(() => {
    const { lat, lon } = mapCoords;
    const overlay = mapLayer;
    const product = mapModel;
    const vfrParam = showVfrMap ? '&vfr=1' : '';
    const heliParam = showHeliports ? '&heliport=1' : '';

    return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=1200&height=600&zoom=8&level=surface&overlay=${overlay}&product=${product}&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1${vfrParam}${heliParam}`;
  }, [mapCoords, mapLayer, mapModel, showVfrMap, showHeliports]);

  const windyAppUrl = useMemo(() => {
    const { lat, lon } = mapCoords;
    return `https://www.windy.com/${mapLayer}/${lat}/${lon}?${lat},${lon},8`;
  }, [mapCoords, mapLayer]);

  const mapLayerOptions = [
    { value: 'radar', label: 'Radar' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'wind', label: 'Wind' },
    { value: 'clouds', label: 'Clouds' },
    { value: 'rain', label: 'Rain' },
    { value: 'temp', label: 'Temperature' },
  ] as const;

  const fetchWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icao.trim()) return;

    const station = icao.toUpperCase().trim();
    setLoading(true);

    try {
      let noaaJson: any[] = [];
      let tafJson: any[] = [];

      try {
        const noaaRes = await fetch(`/api/weather?ids=${station}`);
        noaaJson = await noaaRes.json();
      } catch (err) {
        console.error("METAR fetch error", err);
      }
      
      try {
        const tafRes = await fetch(`/api/weather/taf?ids=${station}`);
        tafJson = await tafRes.json();
      } catch (err) {
        console.error("TAF fetch error", err);
      }

      try {
        const avwxRes = await fetch(`/api/weather/avwx?icao=${station}`);
        if (avwxRes.ok) setAvwxData(await avwxRes.json()); else setAvwxData(null);
      } catch {
        setAvwxData(null);
      }

      try {
        const checkWxRes = await fetch(`/api/weather/check-wx?icao=${station}`);
        if (checkWxRes.ok) {
          const json = await checkWxRes.json();
          if (json.data && json.data.length > 0) setCheckWxData(json.data[0]); else setCheckWxData(null);
        } else {
          setCheckWxData(null);
        }
      } catch {
        setCheckWxData(null);
      }

      // Determine if we have any primary data (METAR or TAF)
      const hasMetar = noaaJson && noaaJson.length > 0;
      const hasTaf = tafJson && tafJson.length > 0;

      if (!hasMetar && !hasTaf) {
        toast({ 
          variant: 'destructive', 
          title: 'Station Not Found', 
          description: `No current METAR or TAF data available for ${station}.` 
        });
        setWeatherData(null);
        setTafData(null);
        setAvwxData(null);
        setCheckWxData(null);
        return;
      }

      // Set the data
      if (hasMetar) setWeatherData(noaaJson[0]); else setWeatherData(null);
      if (hasTaf) setTafData(tafJson[0]); else setTafData(null);

      toast({ 
        title: 'Weather Updated', 
        description: `Data retrieved for ${station}${!hasMetar ? ' (Forecast Only)' : ''}` 
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Fetching Data', description: error.message });
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate Flight Category if API doesn't provide it
  const calculateFlightCategory = (data: any) => {
    if (!data) return 'UNKNOWN';
    if (data.fltcat && data.fltcat !== 'UNKNOWN') return data.fltcat;

    const vis = parseFloat(data.visib);
    
    // Find ceiling (lowest BKN or OVC layer)
    let ceiling = 10000; // Default high
    if (data.clouds && data.clouds.length > 0) {
      const layers = data.clouds.filter((c: any) => c.cover === 'BKN' || c.cover === 'OVC');
      if (layers.length > 0) {
        ceiling = Math.min(...layers.map((l: any) => l.base || 10000));
      }
    }

    if (vis > 5 && ceiling > 3000) return 'VFR';
    if (vis >= 3 && ceiling >= 1000) return 'MVFR';
    if (vis >= 1 && ceiling >= 500) return 'IFR';
    if (vis < 1 || ceiling < 500) return 'LIFR';
    
    return 'VFR'; // Default to VFR if visibility is good and no ceiling found
  };

  const getFlightCategoryColor = (category?: string) => {
    switch (category) {
      case 'VFR': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'MVFR': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'IFR': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'LIFR': return 'bg-purple-500 hover:bg-purple-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 pt-6 md:p-8 max-w-[1200px] w-full mx-auto">
      <Card className="flex-1 flex min-h-0 flex-col overflow-hidden shadow-none border">
        <MainPageHeader
          title="Weather Center"
          description="Multi-source METAR, TAF, decoded weather, and live operations mapping."
          actions={
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <form onSubmit={fetchWeather} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Input
                  placeholder="Enter ICAO (e.g. KJFK, EGLL)"
                  value={icao}
                  onChange={(e) => setIcao(e.target.value)}
                  className="w-full sm:w-64 font-mono uppercase font-black bg-background h-11"
                  maxLength={4}
                />
                <Button type="submit" disabled={loading} className="w-full sm:w-auto font-black uppercase tracking-wider h-11 px-8 gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? <span className="animate-spin text-lg">↻</span> : <Search className="w-4 h-4" />}
                  {loading ? 'Fetching' : 'Search Updates'}
                </Button>
              </form>
              <div className="h-10 w-px bg-border hidden sm:block mx-1" />
              <Button 
                variant="outline" 
                onClick={() => setIsSyncDialogOpen(true)}
                className="w-full sm:w-auto font-black uppercase tracking-widest h-11 px-6 gap-2 border-amber-500/50 hover:bg-amber-500 hover:text-black transition-all bg-amber-500/5 text-amber-500 shadow-sm"
              >
                <Lock className="w-4 h-4" />
                Sync Premium
              </Button>
            </div>
          }
        />
        <CardContent className="flex-1 overflow-y-auto min-h-0 p-0 no-scrollbar">
          <div className="flex flex-col min-h-0">
            {!weatherData && !loading && (
              <div className="p-4 md:p-6">
                <Card className="border-dashed h-[300px] flex flex-col items-center justify-center p-6 shadow-none bg-muted/10">
                  <CloudLightning className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-center text-sm">Enter an ICAO code above to view current conditions.</p>
                </Card>
              </div>
            )}

            {loading && (
              <div className="p-4 md:p-6">
                <div className="space-y-4">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-[120px] rounded-xl" />
                    <Skeleton className="h-[120px] rounded-xl" />
                    <Skeleton className="h-[120px] rounded-xl" />
                  </div>
                </div>
              </div>
            )}

            {(weatherData || tafData) && !loading && (
                <Tabs defaultValue={weatherData ? "overview" : "taf"} className="flex flex-col space-y-6 p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-foreground">Multi-Source</p>
                    {weatherData && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border bg-popover text-popover-foreground">NOAA</Badge>}
                    {tafData && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border bg-popover text-popover-foreground">TAF</Badge>}
                    {avwxData && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border bg-popover text-popover-foreground">AVWX</Badge>}
                    {checkWxData && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border bg-popover text-popover-foreground">CheckWX</Badge>}
                  </div>

                  <div className="space-y-6 pt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-xl border-2 border-card-border bg-card shadow-sm">
                      <div className="p-4 flex flex-col items-center justify-center text-center">
                        <Wind className="w-5 h-5 text-blue-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Wind</span>
                        <p className="text-sm md:text-base font-black">{weatherData?.wdir === 'VRB' ? 'VRB' : weatherData?.wdir ? `${weatherData.wdir}°` : 'CALM'} {weatherData?.wspd ? `@ ${weatherData.wspd}kt` : ''}</p>
                        {weatherData?.wgst && <p className="text-[10px] font-bold text-destructive uppercase">Gusts {weatherData.wgst}kt</p>}
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center text-center border-l">
                        <Eye className="w-5 h-5 text-amber-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Visibility</span>
                        <p className="text-sm md:text-base font-black">{weatherData?.visib != null ? `${weatherData.visib} SM` : 'N/A'}</p>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l">
                        <Thermometer className="w-5 h-5 text-orange-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Temp / Dew</span>
                        <p className="text-sm md:text-base font-black">{weatherData?.temp != null ? `${weatherData.temp}°C` : 'N/A'} / {weatherData?.dewp != null ? `${weatherData.dewp}°C` : 'N/A'}</p>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center text-center border-l border-t md:border-t-0">
                        <Info className="w-5 h-5 text-purple-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Altimeter</span>
                        <p className="text-sm md:text-base font-black">{weatherData?.altim != null ? `${weatherData.altim.toFixed(2)} inHg` : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-muted/20 p-1 rounded-xl border border-card-border shadow-sm overflow-x-auto no-scrollbar">
                      <TabsList className="bg-transparent border-none">
                        <TabsTrigger value="overview" disabled={!weatherData} className="px-6 font-black uppercase text-[10px] tracking-widest text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Overview</TabsTrigger>
                        {tafData && <TabsTrigger value="taf" className="px-6 font-black uppercase text-[10px] tracking-widest text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Forecast (TAF)</TabsTrigger>}
                        {avwxData && <TabsTrigger value="translated" className="px-6 font-black uppercase text-[10px] tracking-widest text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Translated (AVWX)</TabsTrigger>}
                        {checkWxData && <TabsTrigger value="checkwx" className="px-6 font-black uppercase text-[10px] tracking-widest text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Decoded (CheckWX)</TabsTrigger>}
                      </TabsList>
                    </div>
                  </div>

                  {weatherData && (
                    <TabsContent value="overview" className="m-0 space-y-6 pt-2">
                      <Card className="border-l-4 border-l-primary overflow-hidden shadow-sm">
                        <div className="p-6 pb-4 border-b bg-muted/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div>
                            <h3 className="text-4xl font-black tracking-tighter uppercase">{weatherData.icaoId}</h3>
                            <p className="text-muted-foreground font-bold text-sm tracking-wider uppercase flex items-center gap-2 mt-1 text-foreground">
                              <Navigation className="w-3.5 h-3.5" />
                              {weatherData.name || 'Station'} METAR
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right">
                            <Badge className={`text-base font-black px-4 py-1 uppercase tracking-widest shadow-sm ${getFlightCategoryColor(calculateFlightCategory(weatherData))}`}>
                              {calculateFlightCategory(weatherData)}
                            </Badge>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-foreground">
                              OBS: {typeof weatherData.obsTime === 'number'
                                ? new Date(weatherData.obsTime * 1000).toLocaleString()
                                : new Date(weatherData.obsTime).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <CardContent className="p-0">
                          <div className="p-6 bg-muted/10">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 mb-2 text-foreground">RAW METAR</span>
                            <p className="font-mono text-sm font-medium p-4 bg-background border rounded-lg shadow-inner break-words leading-relaxed text-foreground">
                              {weatherData.rawOb}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

              {tafData && (
                <TabsContent value="taf" className="m-0 space-y-6">
                  <Card className="border-l-4 border-l-blue-500 overflow-hidden shadow-sm">
                    <div className="p-6 pb-4 border-b bg-muted/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h3 className="text-4xl font-black tracking-tighter uppercase">{tafData.icaoId} TAF</h3>
                        <p className="text-muted-foreground font-bold text-sm tracking-wider uppercase mt-1 text-foreground">
                          Terminal Aerodrome Forecast
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-foreground">ISSUED: {new Date(tafData.issueTime).toLocaleString()}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-foreground">VALID: {typeof tafData.validTimeFrom === 'number' ? new Date(tafData.validTimeFrom * 1000).toLocaleString() : new Date(tafData.validTimeFrom).toLocaleString()} - {typeof tafData.validTimeTo === 'number' ? new Date(tafData.validTimeTo * 1000).toLocaleString() : new Date(tafData.validTimeTo).toLocaleString()}</span>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-6 bg-muted/10">
                      {tafData.fcsts && tafData.fcsts.map((fcst: any, index: number) => (
                        <div key={index} className="bg-background border rounded-lg p-4 shadow-sm space-y-3">
                          <div className="flex justify-between items-center border-b pb-2">
                            <Badge variant="outline" className="font-black uppercase tracking-tighter text-[10px]">
                              {fcst.type || 'PERIOD'}
                            </Badge>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              FROM: {typeof fcst.timeFrom === 'number' ? new Date(fcst.timeFrom * 1000).toLocaleString() : new Date(fcst.timeFrom).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Wind</span>
                              <p className="text-sm font-black">{fcst.wdir === 'VRB' ? 'VRB' : fcst.wdir ? `${fcst.wdir}°` : 'CALM'} {fcst.wspd ? `@ ${fcst.wspd}kt` : ''}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Visibility</span>
                              <p className="text-sm font-black">{fcst.visib != null ? `${fcst.visib} SM` : 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Clouds</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fcst.clouds && fcst.clouds.map((cloud: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase">
                                    {cloud.cover} @ {cloud.base}FT
                                  </Badge>
                                ))}
                                {(!fcst.clouds || fcst.clouds.length === 0) && <p className="text-sm font-black">CLEAR</p>}
                              </div>
                            </div>
                          </div>
                          {fcst.wx && (
                            <div className="pt-2 border-t">
                              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Weather</span>
                              <p className="text-sm font-bold text-blue-600">{fcst.wx}</p>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="mt-4">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 mb-2 text-foreground">RAW TAF</span>
                        <p className="font-mono text-sm font-medium p-4 bg-background border rounded-lg shadow-inner break-words leading-relaxed text-foreground whitespace-pre-wrap">
                          {tafData.rawTAF}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {checkWxData && (
                <TabsContent value="checkwx" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="shadow-none border border-slate-200">
                      <CardHeader className="py-3 px-4 bg-emerald-50/30 border-b">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Advanced Wind</span>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 font-bold text-sm text-foreground">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Degrees</span>
                          <span className="p-1 font-mono uppercase bg-emerald-100/40 rounded">{checkWxData.wind?.degrees || 'N/A'}°</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Speed</span>
                          <span className="p-1 font-mono uppercase bg-emerald-100/40 rounded">{checkWxData.wind?.speed_kts || 0}KT</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none border border-slate-200 text-foreground">
                      <CardHeader className="py-3 px-4 bg-sky-50/30 border-b">
                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-800">Advanced Conditions</span>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 font-bold text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Humidity</span>
                          <span className="p-1 font-mono uppercase bg-sky-100/40 rounded">{checkWxData.humidity?.percent || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Ceiling</span>
                          <span className="p-1 font-mono uppercase bg-sky-100/40 rounded">{(checkWxData.ceiling?.feet || 0).toLocaleString()} FT</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none border border-slate-200 text-foreground">
                      <CardHeader className="py-3 px-4 bg-orange-50/30 border-b">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-800">Pressure Info</span>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 font-bold text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Altimeter</span>
                          <span className="p-1 font-mono uppercase bg-orange-100/40 rounded">{checkWxData.barometer?.hg || 'N/A'} hg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">hPa / mb</span>
                          <span className="p-1 font-mono uppercase bg-orange-100/40 rounded">{checkWxData.barometer?.hpa || 'N/A'} mb</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}

              {avwxData && (
                <TabsContent value="translated" className="m-0 space-y-6">
                  <Card className="shadow-none border overflow-hidden">
                    <CardHeader className="bg-muted/5 border-b py-4">
                      <CardTitle className="text-lg font-black uppercase tracking-tight text-foreground">Plain English Summary</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground">Generated via AVWX Translation Engine</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-lg font-bold leading-relaxed text-foreground">
                        {avwxData.summary || 'No summary available.'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <div className="space-y-4 pt-4 border-t border-dashed">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                        <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-wider text-foreground">Live Operations Map</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-foreground">
                            Interactive weather layers centered on {weatherData?.icaoId ?? tafData?.icaoId ?? 'Requested Station'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {mapLayerOptions.map((option) => (
                            <Button
                                key={option.value}
                                type="button"
                                variant={mapLayer === option.value ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                'h-8 text-[10px] font-black uppercase tracking-widest',
                                mapLayer === option.value && 'bg-primary text-primary-foreground hover:bg-primary'
                                )}
                                onClick={() => setMapLayer(option.value as any)}
                            >
                                {option.label}
                            </Button>
                            ))}
                        </div>
                    </div>

                    {/* Aviation Control Bar Replicated UI */}
                    <div className="bg-[#3D3D3D] rounded-2xl p-3 flex flex-col gap-3 shadow-2xl border border-[#4D4D4D]">
                         <div className="flex items-center justify-center gap-4">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setMapLayer('radar')}
                                className={cn("rounded-full w-10 h-10 transition-colors", mapLayer === 'radar' ? "bg-amber-500 text-white" : "text-white/70 hover:text-white hover:bg-white/10")}
                             >
                                <CloudLightning className="w-5 h-5" />
                             </Button>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setMapLayer('wind')}
                                className={cn("rounded-full w-10 h-10 transition-colors", mapLayer === 'wind' ? "bg-amber-500 text-white" : "text-white/70 hover:text-white hover:bg-white/10")}
                             >
                                <Wind className="w-5 h-5" />
                             </Button>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setMapLayer('vfr')}
                                className={cn("rounded-full w-10 h-10 transition-colors", mapLayer === 'vfr' ? "bg-amber-500 text-white" : "text-white/70 hover:text-white hover:bg-white/10")}
                             >
                                <Navigation className="w-5 h-5" />
                             </Button>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsSyncDialogOpen(true)}
                                className="rounded-full w-10 h-10 text-white/70 hover:text-white hover:bg-white/10"
                             >
                                <Lock className="w-5 h-5" />
                             </Button>
                         </div>
                         
                         <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-2 border-t border-white/10">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div 
                                    className={cn("w-8 h-4 rounded-full relative transition-colors duration-200", showVfrMap ? "bg-amber-500" : "bg-white/20")}
                                    onClick={() => setShowVfrMap(!showVfrMap)}
                                >
                                    <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200", showVfrMap ? "translate-x-4" : "")} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-white">VFR Airspaces</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div 
                                    className={cn("w-8 h-4 rounded-full relative transition-colors duration-200", showHeliports ? "bg-amber-500" : "bg-white/20")}
                                    onClick={() => setShowHeliports(!showHeliports)}
                                >
                                    <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200", showHeliports ? "translate-x-4" : "")} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-white">Display heliports</span>
                            </label>
                         </div>

                         <div className="grid grid-cols-3 gap-1 bg-white/5 rounded-xl p-1">
                            {['ecmwf', 'gfs', 'icon'].map((m) => (
                                <Button
                                    key={m}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMapModel(m as any)}
                                    className={cn(
                                        "h-8 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        mapModel === m ? "bg-amber-500 text-white shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {m.toUpperCase()}
                                </Button>
                            ))}
                         </div>
                    </div>
                  </div>

                <div className="w-full">
                  <Card className="shadow-none border overflow-hidden bg-slate-900 border-slate-700 relative aspect-video flex-1">
                    <div className="absolute top-4 left-4 z-10 hidden sm:block">
                        <Badge className="bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 shadow-xl">
                           Windy Live Operations Layer
                        </Badge>
                    </div>
                    <iframe
                      width="100%"
                      height="100%"
                      src={windyEmbedUrl}
                      frameBorder="0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Windy Operations Map"
                      className="absolute inset-0 grayscale-[10%]"
                    />
                  </Card>
                </div>
              </div>

                </Tabs>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#1C1C1C] text-white border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <div className="bg-amber-500 p-1.5 rounded-lg">
                    <MapIcon className="w-5 h-5 text-black" />
                </div>
                Sync Windy Account
            </DialogTitle>
            <DialogDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest pt-1">
                Unlock Premium Map Features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                <p className="text-sm font-medium leading-relaxed">
                    To use your <span className="text-amber-500 font-bold">Windy Premium</span> features (high-res models, airport charts, etc.) inside Safeviate, you need to sign in to your Windy.com account in this browser.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-white/80">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">1</div>
                        Click the button below to open Windy login.
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-white/80">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">2</div>
                        Sign in with your email/password.
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-white/80">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">3</div>
                        Return here to see your synced map.
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between items-center bg-white/5 -mx-6 -mb-6 p-6 mt-2 rounded-b-lg border-t border-white/10">
            <Button 
                variant="ghost" 
                onClick={() => setIsSyncDialogOpen(false)}
                className="text-white/50 hover:text-white uppercase font-black text-xs"
            >
                Cancel
            </Button>
            <Button 
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest"
                onClick={() => setIsSyncDialogOpen(false)}
            >
                <a href="https://www.windy.com/login" target="_blank" rel="noreferrer">
                    Log in to Windy.com
                </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
