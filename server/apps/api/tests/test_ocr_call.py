from django.test import SimpleTestCase

from api.endpoints.ocr import extract_words_from_response


class ExtractWordsTest(SimpleTestCase):
    def test_extracts_word_centers_from_overlay(self):
        data = {
            'ParsedResults': [{
                'TextOverlay': {
                    'Lines': [{
                        'Words': [
                            {'WordText': '월', 'Left': 90, 'Top': 0, 'Width': 20, 'Height': 20},
                        ]
                    }]
                }
            }]
        }
        words = extract_words_from_response(data)
        self.assertEqual(len(words), 1)
        self.assertEqual(words[0]['text'], '월')
        self.assertEqual(words[0]['x'], 100)  # 90 + 20/2
        self.assertEqual(words[0]['y'], 10)   # 0 + 20/2

    def test_skips_empty_words_and_missing_overlay(self):
        data = {'ParsedResults': [{'TextOverlay': {'Lines': [{'Words': [
            {'WordText': '  ', 'Left': 1, 'Top': 1, 'Width': 1, 'Height': 1},
        ]}]}}]}
        self.assertEqual(extract_words_from_response(data), [])

    def test_handles_no_parsed_results(self):
        self.assertEqual(extract_words_from_response({}), [])
