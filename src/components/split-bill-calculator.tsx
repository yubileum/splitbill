"use client";

import React from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Globe, 
  ChevronDown, 
  Percent, 
  DollarSign, 
  Users, 
  UserPlus 
} from 'lucide-react';

export default function BillCalculator() {
  const [selectedCurrency, setSelectedCurrency] = React.useState({ code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' });
  const [members, setMembers] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [additionalFees, setAdditionalFees] = React.useState([]);
  const [newMemberName, setNewMemberName] = React.useState('');
  const [newFee, setNewFee] = React.useState({ name: '', value: '', type: 'percentage' });
  const [feeError, setFeeError] = React.useState('');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = React.useState(false);

  const currencies = [
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' }
  ];

  const memberColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500'
  ];

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return `${selectedCurrency.symbol}0`;
    return selectedCurrency.code === 'IDR' 
      ? `${selectedCurrency.symbol} ${Math.round(amount).toLocaleString()}`
      : `${selectedCurrency.symbol}${amount.toFixed(2)}`;
  };

  const addMember = () => {
    if (newMemberName.trim()) {
      setMembers([...members, {
        id: Date.now(),
        name: newMemberName.trim(),
        color: memberColors[members.length % memberColors.length]
      }]);
      setNewMemberName('');
    }
  };

  const removeMember = (id) => {
    setMembers(members.filter(member => member.id !== id));
    setItems(items.map(item => ({
      ...item,
      splits: item.splits?.filter(split => split.memberId !== id) || []
    })));
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      name: '',
      price: '',
      splits: []
    }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemSplitsTotal = (item.splits || []).reduce((splitSum, split) =>
        splitSum + (split.quantity || 0), 0);
      const itemPrice = parseFloat(item.price) || 0;
      return sum + (itemSplitsTotal * itemPrice);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return additionalFees.reduce((total, fee) => {
      const value = parseFloat(fee.value) || 0;
      if (fee.type === 'percentage') {
        return total + (subtotal * value / 100);
      }
      return total + value;
    }, subtotal);
  };

  const calculateMemberShare = (memberId) => {
    let total = 0;
    
    // Calculate items total
    items.forEach(item => {
      const split = item.splits?.find(s => s.memberId === memberId);
      if (split?.quantity > 0) {
        const itemPrice = parseFloat(item.price) || 0;
        total += itemPrice * split.quantity;
      }
    });

    // Calculate fees share
    if (total > 0) {
      const subtotal = calculateSubtotal();
      additionalFees.forEach(fee => {
        const feeValue = parseFloat(fee.value) || 0;
        if (fee.type === 'percentage') {
          // For percentage fees, calculate based on member's portion
          total += (total / subtotal) * (subtotal * feeValue / 100);
        } else {
          // For fixed fees, split equally
          total += feeValue / members.length;
        }
      });
    }
    
    return total;
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.currency-dropdown')) {
        setIsCurrencyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8 text-white">
      <div className="absolute top-4 right-4 currency-dropdown">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50"
          onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
        >
          <Globe size={16} />
          {selectedCurrency.code}
          <ChevronDown size={16} />
        </button>
        
        {isCurrencyDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl">
            {currencies.map(currency => (
              <button
                key={currency.code}
                className="w-full px-4 py-2 text-left hover:bg-gray-700/50"
                onClick={() => {
                  setSelectedCurrency(currency);
                  setIsCurrencyDropdownOpen(false);
                }}
              >
                {currency.name} ({currency.symbol})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Split Bill Calculator</h1>
          <p className="text-gray-400">Simple and accurate bill splitting</p>
        </div>

        {/* Members Section */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Members</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMember()}
                placeholder="Add member name"
                className="bg-gray-700/50 rounded-lg px-3 py-2"
              />
              <button
                onClick={addMember}
                className="p-2 text-blue-400 hover:text-blue-300"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/30"
              >
                <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                  {member.name[0].toUpperCase()}
                </div>
                <span>{member.name}</span>
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Items</h2>
            <button
              onClick={addItem}
              disabled={members.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <PlusCircle size={16} />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="space-y-3 bg-gray-700/30 p-4 rounded-lg">
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="flex-grow bg-gray-700/50 rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                    className="w-28 bg-gray-700/50 rounded-lg px-3 py-2"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {members.map(member => {
                    const split = item.splits?.find(s => s.memberId === member.id);
                    return (
                      <div key={member.id} className="flex items-center gap-2 bg-gray-700/20 p-2 rounded-lg">
                        <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center`}>
                          {member.name[0].toUpperCase()}
                        </div>
                        <span className="flex-grow">{member.name}</span>
                        <input
                          type="number"
                          value={split?.quantity || 0}
                          onChange={(e) => updateItemSplit(item.id, member.id, parseInt(e.target.value) || 0)}
                          className="w-20 bg-gray-700/50 rounded-lg px-3 py-1 text-sm"
                          placeholder="Qty"
                          min="0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Fees Section */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Additional Fees</h2>
          
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Fee name"
              value={newFee.name}
              onChange={(e) => setNewFee({ ...newFee, name: e.target.value })}
              className="flex-grow bg-gray-700/50 rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder="Value"
              value={newFee.value}
              onChange={(e) => setNewFee({ ...newFee, value: e.target.value })}
              className="w-28 bg-gray-700/50 rounded-lg px-3 py-2"
            />
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setNewFee({ ...newFee, type: 'percentage' })}
                className={`px-3 py-1 rounded ${newFee.type === 'percentage' ? 'bg-blue-600' : ''}`}
              >
                <Percent size={16} />
              </button>
              <button
                onClick={() => setNewFee({ ...newFee, type: 'amount' })}
                className={`px-3 py-1 rounded ${newFee.type === 'amount' ? 'bg-blue-600' : ''}`}
              >
                <DollarSign size={16} />
              </button>
            </div>
            <button
              onClick={() => {
                if (newFee.name && newFee.value) {
                  setAdditionalFees([...additionalFees, { ...newFee, id: Date.now() }]);
                  setNewFee({ name: '', value: '', type: 'percentage' });
                }
              }}
              className="p-2 text-blue-400 hover:text-blue-300"
            >
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {additionalFees.map(fee => (
              <div key={fee.id} className="flex justify-between items-center bg-gray-700/30 rounded-lg px-4 py-2">
                <span>{fee.name}</span>
                <div className="flex items-center gap-4">
                  <span>{fee.value}{fee.type === 'percentage' ? '%' : formatCurrency(parseFloat(fee.value))}</span>
                  <button
                    onClick={() => setAdditionalFees(additionalFees.filter(f => f.id !== fee.id))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            {additionalFees.map(fee => (
              <div key={fee.id} className="flex justify-between text-gray-400">
                <span>{fee.name}:</span>
                <span>{formatCurrency(
                  fee.type === 'percentage' 
                    ? calculateSubtotal() * parseFloat(fee.value) / 100
                    : parseFloat(fee.value)
                )}</span>
              </div>
            ))}
            <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-700">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {members.length > 0 && (
            <div className="pt-4 space-y-2 border-t border-gray-700">
              <h3 className="font-semibold">Individual Shares</h3>
              {members.map(member => {
                const total = calculateMemberShare(member.id);
                return (
                  <div key={member.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                        {member.name[0].toUpperCase()}
                      </div>
                      <span>{member.name}</span>
                    </div>
                    <span>{formatCurrency(total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}