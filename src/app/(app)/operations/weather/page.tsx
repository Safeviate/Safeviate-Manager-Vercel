'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Wind, Thermometer, Eye, Navigation, CloudLightning, Info, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function WeatherPage() {
  const [icao, setIcao] = useState('');
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [tafData, setTafData] = useState<any | null>(null);
  const [avwxData, setAvwxData] = useState<any | null>(null);
  const [checkWxData, setCheckWxData] = useState<any | null>(null);
  const [mapLayer, setMapLayer] = useState<'radar' | 'satellite' | 'wind' | 'clouds' | 'rain' | 'temp'>('radar');
  const { toast } = useToast();

  const mapCoords = useMemo(() => {
    const lat = Number(weatherData?.lat ?? weatherData?.latitude ?? 40.75);
    const lon = Number(weatherData?.lon ?? weatherData?.longitude ?? -73.99);
    return {
      lat: Number.isFinite(lat) ? lat : 40.75,
      lon: Number.isFinite(lon) ? lon : -73.99,
    };
  }, [weatherData]);

  const windyEmbedUrl = useMemo(() => {
    const { lat, lon } = mapCoords;
    const overlay = mapLayer;
    const product = mapLayer === 'radar' ? 'radar' : 'ecmwf';

    return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=1200&height=600&zoom=8&level=surface&overlay=${overlay}&product=${product}&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1`;
  }, [mapCoords, mapLayer]);

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
      const noaaRes = await fetch(`/api/weather?ids=${station}`);
      const noaaJson = await noaaRes.json();
      if (noaaJson && noaaJson.length > 0) setWeatherData(noaaJson[0]); else setWeatherData(null);

      // 1.5 Fetch TAF from NOAA
      try {
        const tafRes = await fetch(`/api/weather/taf?ids=${station}`);
        const tafJson = await tafRes.json();
        if (tafJson && tafJson.length > 0) setTafData(tafJson[0]); else setTafData(null);
      } catch (err) { setTafData(null); }

      // 2. Fetch from AVWX (Enhanced translations)
      try {
        const avwxRes = await fetch(`/api/weather/avwx?icao=${station}`);
        if (avwxRes.ok) setAvwxData(await avwxRes.json()); else setAvwxData(null);
      } catch (err) { setAvwxData(null); }

      // 3. Fetch from CheckWX (Advanced decoding)
      try {
        const checkWxRes = await fetch(`/api/weather/check-wx?icao=${station}`);
        if (checkWxRes.ok) {
            const json = await checkWxRes.json();
            if (json.data && json.data.length > 0) setCheckWxData(json.data[0]); else setCheckWxData(null);
        } else setCheckWxData(null);
      } catch (err) { setCheckWxData(null); }

      toast({ title: 'Weather Updated', description: `Data retrieved for ${station}` });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Fetching Data', description: error.message });
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1200px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 text-foreground">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Weather Center</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-foreground">Multi-Source</p>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-blue-50/50">NOAA</Badge>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-purple-50/50">AVWX</Badge>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-emerald-50/50">CheckWX</Badge>
          </div>
        </div>
        <form onSubmit={fetchWeather} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Input 
            placeholder="Enter ICAO (e.g. KJFK, EGLL)" 
            value={icao}
            onChange={(e) => setIcao(e.target.value)}
            className="w-full sm:w-64 font-mono uppercase font-black"
            maxLength={4}
          />
          <Button type="submit" disabled={loading} className="w-full sm:w-auto font-black uppercase tracking-wider shrink-0 gap-2">
            {loading ? <span className="animate-spin text-lg">↻</span> : <Search className="w-4 h-4" />}
            {loading ? 'Fetching' : 'Search'}
          </Button>
        </form>
      </div>

      {!weatherData && !loading && (
        <Card className="border-dashed h-[300px] flex flex-col items-center justify-center p-6 mt-8 shadow-none bg-muted/10">
          <CloudLightning className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-center text-sm">Enter an ICAO code above to view current conditions.</p>
        </Card>
      )}

      {loading && (
        <div className="space-y-4 mt-8">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
          </div>
        </div>
      )}

      {weatherData && !loading && (
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex justify-between items-center bg-muted/20 p-1.5 rounded-xl border overflow-x-auto no-scrollbar">
            <TabsList className="bg-transparent border-none">
                <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest text-foreground">Overview</TabsTrigger>
                {tafData && <TabsTrigger value="taf" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest text-foreground">Forecast (TAF)</TabsTrigger>}
                {avwxData && <TabsTrigger value="translated" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest text-foreground">Translated (AVWX)</TabsTrigger>}
                {checkWxData && <TabsTrigger value="checkwx" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 font-black uppercase text-[10px] tracking-widest text-foreground">Decoded (CheckWX)</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="overview" className="m-0 space-y-6">
            <Card className="border-l-4 border-l-primary overflow-hidden shadow-sm">
                <div className="p-6 pb-4 border-b bg-muted/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                    <h3 className="text-4xl font-black tracking-tighter uppercase">{weatherData.icaoId}</h3>
                    <p className="text-muted-foreground font-bold text-sm tracking-wider uppercase flex items-center gap-2 mt-1 uppercase text-foreground">
                        <Navigation className="w-3.5 h-3.5" /> 
                        {weatherData.name || 'Station'} METAR
                    </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                    <Badge className={`text-base font-black px-4 py-1 uppercase tracking-widest shadow-sm ${getFlightCategoryColor(weatherData.fltcat)}`}>
                        {weatherData.fltcat || 'UNKNOWN'}
                    </Badge>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-foreground">
                        OBS: {typeof weatherData.obsTime === 'number' 
                          ? new Date(weatherData.obsTime * 1000).toLocaleString() 
                          : new Date(weatherData.obsTime).toLocaleString()}
                    </span>
                    </div>
                </div>
                
                <CardContent className="p-0">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-b">
                    <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors text-foreground">
                        <Wind className="w-6 h-6 text-blue-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Wind</span>
                        <p className="text-lg font-black">{weatherData.wdir === 'VRB' ? 'VRB' : weatherData.wdir ? `${weatherData.wdir}°` : 'CALM'} {weatherData.wspd ? `@ ${weatherData.wspd}kt` : ''}</p>
                        {weatherData.wgst && <p className="text-xs font-bold text-destructive uppercase">Gusts {weatherData.wgst}kt</p>}
                    </div>
                    <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors text-foreground">
                        <Eye className="w-6 h-6 text-amber-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Visibility</span>
                        <p className="text-lg font-black">{weatherData.visib != null ? `${weatherData.visib} SM` : 'N/A'}</p>
                    </div>
                    <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors text-foreground">
                        <Thermometer className="w-6 h-6 text-orange-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Temp / Dew</span>
                        <p className="text-lg font-black">{weatherData.temp != null ? `${weatherData.temp}°C` : 'N/A'} / {weatherData.dewp != null ? `${weatherData.dewp}°C` : 'N/A'}</p>
                    </div>
                    <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors text-foreground">
                        <Info className="w-6 h-6 text-purple-500 mb-2" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Altimeter</span>
                        <p className="text-lg font-black">{weatherData.altim != null ? `${weatherData.altim.toFixed(2)} inHg` : 'N/A'}</p>
                    </div>
                </div>
                <div className="p-6 bg-muted/10">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 mb-2 text-foreground">RAW METAR</span>
                    <p className="font-mono text-sm font-medium p-4 bg-background border rounded-lg shadow-inner break-words leading-relaxed text-foreground">
                        {weatherData.rawOb}
                    </p>
                </div>
                </CardContent>
            </Card>
          </TabsContent>

          {tafData && (
            <TabsContent value="taf" className="m-0 space-y-6">
                <Card className="border-l-4 border-l-blue-500 overflow-hidden shadow-sm">
                    <div className="p-6 pb-4 border-b bg-muted/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                        <h3 className="text-4xl font-black tracking-tighter uppercase">{tafData.icaoId} TAF</h3>
                        <p className="text-muted-foreground font-bold text-sm tracking-wider uppercase flex items-center gap-2 mt-1 uppercase text-foreground">
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
                             <div className="flex justify-between items-center text-foreground">
                                <span className="text-muted-foreground">Degrees</span>
                                <span className="p-1 font-mono uppercase bg-emerald-100/40 rounded">{checkWxData.wind?.degrees || 'N/A'}°</span>
                             </div>
                             <div className="flex justify-between items-center text-foreground">
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
                                <span className="text-muted-foreground text-foreground">Altimeter</span>
                                <span className="p-1 font-mono uppercase bg-orange-100/40 rounded">{checkWxData.barometer?.hg || 'N/A'} hg</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-foreground">hPa / mb</span>
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
                            {avwxData.summary || "No summary available."}
                        </p>
                    </CardContent>
                </Card>
            </TabsContent>
          )}

          {/* Fixed Radar Section - Always visible when data is loaded */}
          <div className="space-y-4 pt-4 border-t border-dashed">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-foreground">Live Operations Map</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Interactive weather layers centered on {weatherData.icaoId}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {mapLayerOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={mapLayer === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setMapLayer(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                  <Button asChild type="button" variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest">
                    <a href={windyAppUrl} target="_blank" rel="noreferrer">
                      Open in Windy
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Badge variant="outline" className="text-[9px] font-black uppercase bg-background shadow-xs text-foreground">Powered by Windy.com</Badge>
                </div>
             </div>
             
             <Card className="shadow-none border overflow-hidden bg-slate-900 aspect-video md:aspect-[21/9] w-full relative">
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
        </Tabs>
      )}    </div>
  );
}
