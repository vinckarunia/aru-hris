<?php

namespace App\Services;

class CustomTemplateProcessor extends \PhpOffice\PhpWord\TemplateProcessor
{
    /**
     * Overrides the template constructor to set macro chars BEFORE processing 
     * the zip parts, preventing PhpWord's internal regex from failing.
     */
    public function __construct($documentTemplate)
    {
        // Must set custom macro chars BEFORE calling parent::__construct
        if (method_exists($this, 'setMacroChars')) {
            $this->setMacroChars('[', ']');
        }
        
        parent::__construct($documentTemplate);
    }
    
    /**
     * Fix fragmented brackets inside the XML that TemplateProcessor 
     * fails to fix for custom macro chars.
     */
    public function fixBrokenMacrosForKeys(array $keys)
    {
        $fixer = function ($match) use ($keys) {
            $stripped = strip_tags($match[0]);
            $macroName = trim($stripped, '[]');
            
            // If the stripped bracket text is one of our registered keys, 
            // return it cleanly merged without XML inside.
            if (in_array($macroName, $keys)) {
                return $stripped;
            }
            
            // Otherwise, leave it alone to avoid breaking random brackets
            return $match[0];
        };

        // Fix main part
        $this->tempDocumentMainPart = preg_replace_callback(
            '/\[(?:[^\]<]*<[^>]+>)+[^\]]*\]/U', 
            $fixer, 
            $this->tempDocumentMainPart
        );
        
        // Fix headers
        foreach ($this->tempDocumentHeaders as &$header) {
            $header = preg_replace_callback(
                '/\[(?:[^\]<]*<[^>]+>)+[^\]]*\]/U', 
                $fixer, 
                $header
            );
        }
        
        // Fix footers
        foreach ($this->tempDocumentFooters as &$footer) {
            $footer = preg_replace_callback(
                '/\[(?:[^\]<]*<[^>]+>)+[^\]]*\]/U', 
                $fixer, 
                $footer
            );
        }
    }

    public function getMainPartXml()
    {
        return $this->tempDocumentMainPart;
    }

    public function setMainPartXml($xml)
    {
        $this->tempDocumentMainPart = $xml;
    }
}
