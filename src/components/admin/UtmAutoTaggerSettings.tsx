import React, { useEffect, useState } from 'react';
import { UtmSettings } from '../../types';
import { api } from '../../services/api';
import { Tags, Save, Check, RefreshCw, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';

interface UtmAutoTaggerSettingsProps {
  onShowToast: (msg: string) => void;
}

export const UtmAutoTaggerSettings: React.FC<UtmAutoTaggerSettingsProps> = ({ onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UtmSettings>({
    enabled: true,
    utmSource: 'pinfind',
    utmMedium: 'affiliate',
    utmCampaign: 'discovery_feed',
    appendSubId: true,
    customAffiliateTags: {
      Amazon: 'pinfind-21',
      Myntra: 'pinfind_app',
      Flipkart: 'pinfind_curated',
    },
  });

  const [amazonTag, setAmazonTag] = useState('pinfind-21');
  const [myntraTag, setMyntraTag] = useState('pinfind_app');
  const [flipkartTag, setFlipkartTag] = useState('pinfind_curated');

  useEffect(() => {
    setLoading(true);
    api.getUtmSettings()
      .then((data) => {
        if (data) {
          setSettings(data);
          setAmazonTag(data.customAffiliateTags?.Amazon || 'pinfind-21');
          setMyntraTag(data.customAffiliateTags?.Myntra || 'pinfind_app');
          setFlipkartTag(data.customAffiliateTags?.Flipkart || 'pinfind_curated');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated: UtmSettings = {
        ...settings,
        customAffiliateTags: {
          Amazon: amazonTag.trim(),
          Myntra: myntraTag.trim(),
          Flipkart: flipkartTag.trim(),
        },
      };
      await api.updateUtmSettings(updated);
      setSettings(updated);
      onShowToast('Smart UTM Auto-Tagger & Sub-ID settings saved successfully!');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save UTM settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="utm-auto-tagger-settings-widget" className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
            <Tags className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Smart Outbound UTM & Sub-ID Auto-Tagger
            </h3>
            <p className="text-xs text-slate-500">
              Automatically append campaign source, device identifiers, and partner affiliate tags to all outbound clicks.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Auto-Tagging Active</span>
        </label>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">UTM Source</label>
            <input
              type="text"
              value={settings.utmSource}
              onChange={(e) => setSettings({ ...settings, utmSource: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-indigo-500"
              placeholder="pinfind"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">UTM Medium</label>
            <input
              type="text"
              value={settings.utmMedium}
              onChange={(e) => setSettings({ ...settings, utmMedium: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-indigo-500"
              placeholder="affiliate"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">UTM Campaign</label>
            <input
              type="text"
              value={settings.utmCampaign}
              onChange={(e) => setSettings({ ...settings, utmCampaign: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-indigo-500"
              placeholder="discovery_feed"
              required
            />
          </div>
        </div>

        {/* Partner Associate IDs */}
        <div className="pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Partner Network Tag Overrides
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Amazon Associates Tag (?tag=)</label>
              <input
                type="text"
                value={amazonTag}
                onChange={(e) => setAmazonTag(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-indigo-500"
                placeholder="pinfind-21"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Myntra Partner Sub-ID</label>
              <input
                type="text"
                value={myntraTag}
                onChange={(e) => setMyntraTag(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-indigo-500"
                placeholder="pinfind_app"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Flipkart Affiliate ID</label>
              <input
                type="text"
                value={flipkartTag}
                onChange={(e) => setFlipkartTag(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-indigo-500"
                placeholder="pinfind_curated"
              />
            </div>
          </div>
        </div>

        {/* Live URL Example Output */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
            Generated Live Outbound Example
          </span>
          <p className="text-emerald-400 truncate">
            https://www.amazon.in/dp/B08...?tag={amazonTag}&amp;utm_source={settings.utmSource}&amp;utm_medium={settings.utmMedium}&amp;utm_campaign={settings.utmCampaign}&amp;ascsubtag=pinfind_desktop_x8f
          </p>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save UTM Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
