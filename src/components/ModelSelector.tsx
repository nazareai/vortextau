import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Model = {
    name: string;
    details: {
        parameter_size: string;
        quantization_level: string;
    };
}

export function ModelSelector({ onSelectModel }: { onSelectModel: (model: string) => void }) {
    const [models, setModels] = useState<Model[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/models')
            .then(response => response.json())
            .then(data => setModels(data))
            .catch(error => console.error('Error fetching models:', error));
    }, []);

    return (
        <Select onValueChange={onSelectModel}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
                {models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                        {model.name} ({model.details.parameter_size}, {model.details.quantization_level})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}