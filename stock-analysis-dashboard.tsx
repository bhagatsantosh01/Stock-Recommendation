import React, { useState } from 'react';
import { Upload, Filter, Settings, Star, TrendingUp, DollarSign } from 'lucide-react';

const StockAnalysisDashboard = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('shortTermScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [fileUploaded, setFileUploaded] = useState(false);
  
  const [filters, setFilters] = useState({
    pe: 50, upside: 0, mktCap: 0, oneM: -100, threeM: -100, volume: 0,
    roe: 0, roce: 0, debt: 5, rsi: 0, priceVs52W: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const parseVal = (str, isPercent = false) => {
    if (!str || str === '-' || str === 'NA' || str === 'N/A' || str === '') return null;
    const cleaned = isPercent ? String(str).replace('%', '') : str;
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    
    try {
      // For Excel files, we'll parse it as CSV (if converted) or handle sheets
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target.result;
        
        // Try to parse as CSV first (if user exports Excel to CSV)
        if (file.name.endsWith('.csv')) {
          parseCSVData(data);
        } else {
          // For Excel files, we need to load the XLSX library
          const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Read all sheets
          const sheets = {};
          workbook.SheetNames.forEach(sheetName => {
            sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          });
          
          processExcelSheets(sheets);
        }
      };
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please make sure it\'s a valid Excel or CSV file.');
      setLoading(false);
    }
  };

  const parseCSVData = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const data = lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = [];
      let curr = '', inQ = false;
      for (let c of line) {
        if (c === '"') inQ = !inQ;
        else if (c === ',' && !inQ) { vals.push(curr.trim().replace(/"/g, '')); curr = ''; }
        else curr += c;
      }
      vals.push(curr.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });
    
    analyzeStocks(data);
  };

  const processExcelSheets = (sheets) => {
    // Merge data from different sheets based on Company Name
    const overview = sheets['Overview'] || [];
    const technical = sheets['Technical'] || [];
    const valuation = sheets['Valuation'] || [];
    const financials = sheets['Financials'] || [];
    const marginGrowth = sheets['Margin & Growth'] || sheets['Margins & Growth'] || sheets['Margin and Growth'] || [];
    const shareholding = sheets['Shareholding'] || sheets['Shareholding Pattern'] || [];
    
    // Merge all data
    const merged = overview.map(stock => {
      const companyName = stock['Company Name'] || stock['Company'] || stock['Stock'];
      const techData = technical.find(t => (t['Company Name'] || t['Company'] || t['Stock']) === companyName) || {};
      const valData = valuation.find(v => (v['Company Name'] || v['Company'] || v['Stock']) === companyName) || {};
      const finData = financials.find(f => (f['Company Name'] || f['Company'] || f['Stock']) === companyName) || {};
      const marginData = marginGrowth.find(m => (m['Company Name'] || m['Company'] || m['Stock']) === companyName) || {};
      const holdingData = shareholding.find(h => (h['Company Name'] || h['Company'] || h['Stock']) === companyName) || {};
      
      return { ...stock, ...techData, ...valData, ...finData, ...marginData, ...holdingData };
    });
    
    analyzeStocks(merged);
  };

  const analyzeStocks = (data) => {
    const analyzed = data.map(s => {
      // Extract all possible field variations
      const companyName = s['Company Name'] || s['Company'] || s['Stock'] || 'Unknown';
      const price = parseVal(s['Current Price (Rs)'] || s['Price'] || s['LTP'] || s['Close']);
      const oneM = parseVal(s['1M Returns'] || s['1 Month Return'] || s['1M'], true);
      const threeM = parseVal(s['3M Returns'] || s['3 Month Return'] || s['3M'], true);
      const oneW = parseVal(s['1W Returns'] || s['1 Week Return'] || s['1W'], true);
      const upside = parseVal(s['Potential Upside'] || s['Upside'] || s['Target Upside'], true);
      const pe = parseVal(s['PE TTM'] || s['PE'] || s['P/E']);
      const pb = parseVal(s['PB Ratio'] || s['P/B'] || s['Price to Book']);
      const roe = parseVal(s['ROE (%)'] || s['ROE'] || s['Return on Equity'], true);
      const roce = parseVal(s['ROCE (%)'] || s['ROCE'] || s['Return on Capital'], true);
      const debt = parseVal(s['Debt to Equity'] || s['Debt/Equity'] || s['D/E']);
      const mktCap = parseVal(s['Market Cap (Rs Cr)'] || s['Market Cap'] || s['Mcap']);
      const volume = parseInt(s['Volume'] || s['Avg Volume'] || 0);
      const high52 = parseVal(s['52 Wk High (Rs)'] || s['52W High'] || s['52 Week High']);
      const low52 = parseVal(s['52 Wk Low (Rs)'] || s['52W Low'] || s['52 Week Low']);
      const rsi = parseVal(s['RSI'] || s['RSI(14)']);
      const profitGrowth = parseVal(s['Profit Growth (%)'] || s['Profit Growth'] || s['EPS Growth'] || s['Net Profit Growth'], true);
      const salesGrowth = parseVal(s['Sales Growth (%)'] || s['Sales Growth'] || s['Revenue Growth'] || s['Sales CAGR'], true);
      const opMargin = parseVal(s['Operating Margin (%)'] || s['Operating Margin'] || s['OPM'] || s['EBIT Margin'], true);
      const netMargin = parseVal(s['Net Profit Margin (%)'] || s['Net Margin'] || s['NPM'] || s['PAT Margin'], true);
      const promoterHolding = parseVal(s['Promoter Holding (%)'] || s['Promoter Holding'] || s['Promoters'], true);
      const fiiHolding = parseVal(s['FII Holding (%)'] || s['FII Holding'] || s['FII'], true);
      const diiHolding = parseVal(s['DII Holding (%)'] || s['DII Holding'] || s['DII'], true);
      const pledgePercent = parseVal(s['Pledge (%)'] || s['Promoter Pledge'] || s['Pledged %'], true);
      
      // SHORT TERM SCORING (Focus on momentum & technical indicators)
      let shortTermScore = 0;
      let reasons = [];
      
      // 1. Recent Momentum (35 points max) - HIGHEST WEIGHT for short term
      if (oneW && oneW > 3) {
        shortTermScore += Math.min(oneW * 2, 15);
        reasons.push(`Strong 1W: +${oneW.toFixed(1)}%`);
      }
      if (oneM && oneM > 5) {
        shortTermScore += Math.min(oneM / 1.5, 15);
        reasons.push(`1M momentum: +${oneM.toFixed(1)}%`);
      }
      if (threeM && threeM > 0) {
        shortTermScore += Math.min(threeM / 5, 5);
      }
      
      // 2. Upside Potential (20 points max)
      if (upside && upside > 10) {
        shortTermScore += Math.min(upside / 2.5, 20);
        reasons.push(`${upside.toFixed(1)}% upside`);
      }
      
      // 3. Technical Position (15 points max)
      if (price && high52) {
        const pctFrom52High = ((high52 - price) / high52) * 100;
        if (pctFrom52High > 10 && pctFrom52High < 30) {
          shortTermScore += 10;
          reasons.push(`Near 52W high`);
        } else if (pctFrom52High >= 30 && pctFrom52High < 50) {
          shortTermScore += 5;
        }
      }
      
      if (rsi && rsi >= 40 && rsi <= 65) {
        shortTermScore += 5;
        reasons.push(`Healthy RSI: ${rsi.toFixed(0)}`);
      }
      
      // 4. Valuation (15 points max) - Lower weight for short term
      if (pe && pe > 0 && pe < 30) {
        shortTermScore += 10;
      } else if (pe && pe >= 30 && pe < 50) {
        shortTermScore += 5;
      }
      
      if (pb && pb > 0 && pb < 3) {
        shortTermScore += 5;
      }
      
      // 5. Fundamentals (15 points max) - Quick checks
      if (roe && roe > 12) {
        shortTermScore += 8;
        reasons.push(`ROE: ${roe.toFixed(1)}%`);
      }
      
      if (debt !== null && debt < 1.5) {
        shortTermScore += 7;
        if (debt < 0.5) reasons.push(`Low debt: ${debt.toFixed(2)}`);
      }
      
      // 6. MARGIN & GROWTH QUALITY (15 points) - NEW
      if (opMargin && opMargin > 15) {
        shortTermScore += 6;
        reasons.push(`Strong margins: ${opMargin.toFixed(1)}%`);
      } else if (opMargin && opMargin > 10) {
        shortTermScore += 3;
      }
      
      if (profitGrowth && profitGrowth > 25) {
        shortTermScore += 6;
        reasons.push(`High growth: ${profitGrowth.toFixed(1)}%`);
      } else if (profitGrowth && profitGrowth > 15) {
        shortTermScore += 3;
      }
      
      if (netMargin && netMargin > 12) {
        shortTermScore += 3;
      }
      
      // 7. SHAREHOLDING PATTERN (10 points) - NEW
      if (promoterHolding && promoterHolding > 50) {
        shortTermScore += 5;
        if (promoterHolding > 70) reasons.push(`Strong promoter: ${promoterHolding.toFixed(1)}%`);
      }
      
      if (pledgePercent !== null && pledgePercent < 5) {
        shortTermScore += 3;
        if (pledgePercent === 0) reasons.push(`Zero pledge`);
      } else if (pledgePercent !== null && pledgePercent >= 50) {
        shortTermScore -= 5; // Penalty for high pledge
      }
      
      if (fiiHolding && fiiHolding > 10) {
        shortTermScore += 2;
      }
      
      return {
        'Company Name': companyName,
        price, oneM, threeM, oneW, upside, pe, pb, roe, roce, debt,
        mktCap, volume, high52, low52, rsi, profitGrowth, salesGrowth,
        opMargin, netMargin, promoterHolding, fiiHolding, diiHolding, pledgePercent,
        shortTermScore,
        reasons,
        ...s
      };
    });

    setStocks(analyzed);
    setFileUploaded(true);
    setLoading(false);
  };

  const filtered = stocks.filter(s => {
    if (s.pe && s.pe > filters.pe) return false;
    if (s.upside && s.upside < filters.upside) return false;
    if (s.mktCap && s.mktCap < filters.mktCap) return false;
    if (s.oneM && s.oneM < filters.oneM) return false;
    if (s.threeM && s.threeM < filters.threeM) return false;
    if (s.volume && s.volume < filters.volume) return false;
    if (s.roe && s.roe < filters.roe) return false;
    if (s.roce && s.roce < filters.roce) return false;
    if (s.debt && s.debt > filters.debt) return false;
    if (s.rsi && s.rsi < filters.rsi) return false;
    return true;
  }).sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (col) => {
    if (sortBy === col) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDirection('desc'); }
  };

  if (!fileUploaded && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-3xl w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Short-Term Stock Screener</h1>
          <p className="text-gray-600 mb-8 text-center">Upload your Excel file to find the best stocks for quick returns</p>
          
          <div className="border-2 border-dashed border-green-300 rounded-xl p-8 hover:border-green-500 transition">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="file-up" />
            <label htmlFor="file-up" className="cursor-pointer flex flex-col items-center">
              <div className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 mb-3">
                <Upload size={24} /> Upload Excel/CSV File
              </div>
              <p className="text-sm text-gray-500">Supports multi-sheet Excel files (.xlsx, .xls) or CSV</p>
            </label>
          </div>

          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={20} />
              Short-Term Focus (1-3 months)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold text-green-600 mb-1">Priority Factors:</p>
                <ul className="space-y-1 text-gray-700">
                  <li>✓ Recent Momentum (1W, 1M)</li>
                  <li>✓ Technical Indicators (RSI)</li>
                  <li>✓ Near-term Upside</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-emerald-600 mb-1">Safety Checks:</p>
                <ul className="space-y-1 text-gray-700">
                  <li>✓ Reasonable Valuation</li>
                  <li>✓ Low Debt Levels</li>
                  <li>✓ Decent Profitability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Analyzing stocks for short-term opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="text-green-600" />
              Short-Term Stock Picks
            </h1>
            <p className="text-gray-600">Optimized for 1-3 month returns • {filtered.length} stocks analyzed</p>
          </div>
          <label htmlFor="reup" className="cursor-pointer inline-flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg border-2 border-green-200 hover:bg-gray-50 text-sm">
            <Upload size={16} /> Upload New File
          </label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="reup" />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2">
            <Filter size={18} /> {showFilters ? 'Hide' : 'Show'} Filters
          </button>

          {showFilters && (
            <div className="pt-4 border-t mt-4">
              <h3 className="font-semibold mb-4">Quick Filters</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Min 1M Return: {filters.oneM}%</label>
                  <input type="range" min="-50" max="50" value={filters.oneM} onChange={(e) => setFilters({...filters, oneM: +e.target.value})} className="w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium">Min Upside: {filters.upside}%</label>
                  <input type="range" min="0" max="50" value={filters.upside} onChange={(e) => setFilters({...filters, upside: +e.target.value})} className="w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium">Max PE: {filters.pe}</label>
                  <input type="range" min="10" max="100" value={filters.pe} onChange={(e) => setFilters({...filters, pe: +e.target.value})} className="w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Debt: {filters.debt}</label>
                  <input type="range" min="0" max="5" step="0.5" value={filters.debt} onChange={(e) => setFilters({...filters, debt: +e.target.value})} className="w-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Stocks</div>
            <div className="text-2xl font-bold">{stocks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">After Filters</div>
            <div className="text-2xl font-bold text-green-600">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Avg Score</div>
            <div className="text-2xl font-bold text-emerald-600">
              {(filtered.reduce((s, st) => s + (st.shortTermScore || 0), 0) / filtered.length || 0).toFixed(1)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Top Score</div>
            <div className="text-2xl font-bold text-green-700">
              {filtered.length > 0 ? (filtered[0].shortTermScore || 0).toFixed(1) : '0'}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="text-yellow-500" />
              <DollarSign className="text-green-600" />
              Top 10 Stocks for Short-Term Returns
            </h2>
            <button 
              onClick={() => setShowMethodology(!showMethodology)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2 text-sm font-semibold"
            >
              {showMethodology ? '✕ Hide' : 'ℹ️ Show'} Selection Criteria
            </button>
          </div>

          {showMethodology && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                How We Select the Top 10 Stocks (Scoring Methodology)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                      <h4 className="font-bold text-gray-900">Recent Momentum (35 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">HIGHEST PRIORITY - Stocks already showing strength</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>1 Week Returns:</strong> Up to 15 pts (2x weight)</li>
                      <li>• <strong>1 Month Returns:</strong> Up to 15 pts</li>
                      <li>• <strong>3 Month Returns:</strong> Up to 5 pts</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: Recent momentum often continues in short-term</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                      <h4 className="font-bold text-gray-900">Upside Potential (20 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Based on analyst target prices</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>10%+ upside:</strong> Starts earning points</li>
                      <li>• <strong>25%+ upside:</strong> Maximum 20 pts</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: Shows clear room for price appreciation</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                      <h4 className="font-bold text-gray-900">Technical Position (15 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Chart patterns and technical indicators</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>Near 52W High:</strong> 10-30% below = 10 pts</li>
                      <li>• <strong>RSI 40-65:</strong> Healthy range = 5 pts</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: Good entry point, not overbought</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                      <h4 className="font-bold text-gray-900">Valuation Check (15 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Ensures you're not overpaying</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>PE Ratio &lt; 30:</strong> Up to 10 pts</li>
                      <li>• <strong>P/B Ratio &lt; 3:</strong> Up to 5 pts</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: Reasonable price = lower downside risk</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
                      <h4 className="font-bold text-gray-900">Safety Fundamentals (15 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Quality and financial health checks</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>ROE &gt; 12%:</strong> Up to 8 pts</li>
                      <li>• <strong>Debt &lt; 1.5:</strong> Up to 7 pts</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: Strong fundamentals reduce risk</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">6</div>
                      <h4 className="font-bold text-gray-900">Margin & Growth Quality (15 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Profitability and expansion potential</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>Operating Margin &gt; 15%:</strong> 6 pts</li>
                      <li>• <strong>Profit Growth &gt; 25%:</strong> 6 pts</li>
                      <li>• <strong>Net Margin &gt; 12%:</strong> 3 pts</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: High margins = pricing power & efficiency</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow border-2 border-indigo-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">7</div>
                      <h4 className="font-bold text-gray-900">Shareholding Pattern (10 points)</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Ownership quality and confidence</p>
                    <ul className="text-xs space-y-1 text-gray-600 ml-10">
                      <li>• <strong>Promoter Holding &gt; 50%:</strong> 5 pts</li>
                      <li>• <strong>Low Pledge &lt; 5%:</strong> 3 pts</li>
                      <li>• <strong>FII Holding &gt; 10%:</strong> 2 pts</li>
                      <li>• <strong>⚠️ High Pledge &gt; 50%:</strong> -5 pts penalty</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 ml-10">Why: Strong holding = management confidence</p>
                  </div>

                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-300">
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      Total Score = 125 Points Maximum
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">Stocks ranked by total score across all 7 categories</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="font-semibold">Excellent (85-125):</span>
                        <span className="text-green-700 font-bold">Strong Buy</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="font-semibold">Good (60-85):</span>
                        <span className="text-blue-700 font-bold">Worth Considering</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="font-semibold">Average (&lt;60):</span>
                        <span className="text-gray-700 font-bold">Monitor Only</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4">
                <p className="text-sm text-gray-800">
                  <strong>💡 Enhanced Philosophy:</strong> We prioritize <strong>momentum stocks</strong> (already moving) 
                  with <strong>growth potential</strong> (upside + profit growth) while ensuring <strong>quality operations</strong> (high margins), 
                  <strong>fair valuation</strong>, <strong>strong fundamentals</strong> (ROE, low debt), and <strong>confident ownership</strong> (promoter holding, low pledge). 
                  This 7-factor approach maximizes short-term returns while managing risk comprehensively.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {filtered.slice(0, 10).map((s, i) => (
              <div key={i} className={`bg-white rounded-xl shadow-lg p-4 border-2 ${i < 3 ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex justify-between mb-2">
                  <div className={`text-xl font-bold ${i < 3 ? 'text-green-700' : 'text-gray-700'}`}>#{i + 1}</div>
                  <div className="text-right">
                    <div className="text-lg font-bold">₹{s.price ? s.price.toFixed(2) : 'N/A'}</div>
                    {s.oneW !== null && s.oneW !== undefined && (
                      <div className={s.oneW >= 0 ? 'text-green-600 text-xs font-bold' : 'text-red-600 text-xs font-bold'}>
                        1W: {s.oneW >= 0 ? '+' : ''}{s.oneW.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-bold mb-3 leading-tight">{s['Company Name']}</h3>
                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score</span>
                    <span className="font-bold text-green-700">{(s.shortTermScore || 0).toFixed(1)}</span>
                  </div>
                  {s.upside && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Upside</span>
                      <span className="font-bold text-emerald-600">+{s.upside.toFixed(1)}%</span>
                    </div>
                  )}
                  {s.oneM !== null && s.oneM !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">1M Return</span>
                      <span className={s.oneM >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                        {s.oneM >= 0 ? '+' : ''}{s.oneM.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {s.pe && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">PE</span>
                      <span>{s.pe.toFixed(2)}</span>
                    </div>
                  )}
                  {s.rsi && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSI</span>
                      <span className="font-semibold">{s.rsi.toFixed(0)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs font-semibold mb-1 text-gray-700">Why Buy Now:</p>
                  <ul className="space-y-0.5">
                    {(s.reasons || []).slice(0, 3).map((r, j) => (
                      <li key={j} className="text-xs text-gray-600 flex gap-1">
                        <span className="text-green-500">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600">
            <h2 className="text-2xl font-bold text-white">All Stocks Ranked ({filtered.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th onClick={() => handleSort('shortTermScore')} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    Score {sortBy === 'shortTermScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('oneW')} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    1W {sortBy === 'oneW' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('oneM')} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    1M {sortBy === 'oneM' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('upside')} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    Upside {sortBy === 'upside' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('pe')} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    PE {sortBy === 'pe' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('rsi')} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    RSI {sortBy === 'rsi' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((s, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${i < 10 ? 'bg-green-50' : ''}`}>
                    <td className="px-3 py-2">
                      <span className={i < 10 ? 'font-bold text-green-700' : 'text-gray-400'}>#{i + 1}</span>
                    </td>
                    <td className="px-3 py-2 font-medium">{s['Company Name']}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {(s.shortTermScore || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {s.oneW !== null && s.oneW !== undefined ? (
                        <span className={s.oneW >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {s.oneW >= 0 ? '+' : ''}{s.oneW.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {s.oneM !== null && s.oneM !== undefined ? (
                        <span className={s.oneM >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {s.oneM >= 0 ? '+' : ''}{s.oneM.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {s.upside ? <span className="text-emerald-600 font-semibold">+{s.upside.toFixed(1)}%</span> : '-'}
                    </td>
                    <td className="px-3 py-2">{s.pe ? s.pe.toFixed(2) : '-'}</td>
                    <td className="px-3 py-2">{s.rsi ? s.rsi.toFixed(0) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>⚠️ Short-Term Trading Disclaimer:</strong> Short-term trading carries higher risk. This analysis is for informational purposes only. 
            Past performance doesn't guarantee future results. Invest only what you can afford to lose. Consult a financial advisor before trading.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockAnalysisDashboard;